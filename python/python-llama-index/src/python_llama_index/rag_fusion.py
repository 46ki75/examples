"""RAG-Fusion — fan one query out into many, then fuse the result lists.

Where `advanced_rag` fuses results from two *retrievers* (BM25 + vector)
for one rewritten query, RAG-Fusion fuses results for several *queries*
against one retriever. The bet: a single query — however well rewritten —
encodes a single perspective, while an LLM can phrase the same information
need from several angles, and chunks that keep showing up across those
angles are probably what the user wants. The stages:

    1. Query generation - an LLM writes N alternative phrasings of the
                          original question (the original is kept too)
    2. Fan-out retrieval - vector search runs once per query
    3. Merge             - reciprocal rank fusion of the N+1 ranked lists
                           (reused from advanced_rag; RRF doesn't care
                           whether the lists came from different retrievers
                           or different queries)
    4. Synthesize        - the LLM answers the *original* question from
                           the fused top chunks

The two techniques compose: each generated query could fan out over both
retrievers, with RRF merging all (queries x retrievers) lists at once.
LlamaIndex also ships this whole pattern off the shelf as
``QueryFusionRetriever(mode="reciprocal_rerank", num_queries=...)`` — this
module hand-rolls it so every stage is visible and logged.

Ingestion is delegated to `manage_documents`, exactly as in advanced_rag:
the persisted index is loaded from storage/ and synced idempotently.

Run:
    uv run --env-file .env python -m python_llama_index.rag_fusion
"""

import logging
import os

from llama_index.core import (
    Settings,
    SimpleDirectoryReader,
    get_response_synthesizer,  # pyright: ignore[reportUnknownVariableType]
)
from llama_index.core.schema import NodeWithScore
from llama_index.embeddings.openai_like import (  # pyright: ignore[reportMissingTypeStubs]
    OpenAILikeEmbedding,
)
from llama_index.llms.openrouter import OpenRouter

from python_llama_index.advanced_rag import log_stage, reciprocal_rank_fusion
from python_llama_index.manage_documents import (
    DATA_DIR,
    PERSIST_DIR,
    load_or_create_index,
    sync_index,
)

logger = logging.getLogger(__name__)

# Deliberately vague — exactly the kind of query RAG-Fusion exists for.
# No single phrasing of it mentions wind, solar, or generators, but the
# generated variants between them should.
QUERY = "Tell me about the outpost's energy situation."

NUM_GENERATED_QUERIES = 4
FUSED_TOP_K = 4

QUERY_GEN_PROMPT = (
    "You are generating search queries for a retrieval system. Write "
    "{num} different versions of the question below, each approaching it "
    "from a different angle: synonyms, a more specific phrasing, a more "
    "general phrasing, a related sub-question. Return exactly one query "
    "per line with no numbering or commentary.\n"
    "Question: {query}\n"
    "Queries:"
)


def parse_generated_queries(raw: str) -> list[str]:
    """Turn the LLM's reply into a clean list of queries.

    Chat models love decorating lists even when told not to, so leading
    numbering and bullets are stripped; blank lines and duplicates are
    dropped. Pure and offline, so it is unit-testable.
    """
    queries: list[str] = []
    for line in raw.splitlines():
        query = line.strip().lstrip("0123456789.)-* ").strip()
        if query and query not in queries:
            queries.append(query)
    return queries


def generate_queries(query: str, num: int) -> list[str]:
    """Stage 1: fan the question out into ``num`` alternative phrasings.

    The original query is always kept (first), so even if the LLM returns
    nothing usable — reasoning models can burn the whole ``max_tokens``
    budget on thinking — retrieval degrades to plain single-query RAG
    instead of breaking.
    """
    raw = Settings.llm.complete(QUERY_GEN_PROMPT.format(num=num, query=query)).text
    generated = parse_generated_queries(raw)
    if not generated:
        logger.warning("query generation came back empty; using the original only")
    return [query, *(q for q in generated if q != query)][: num + 1]


def main() -> None:
    logging.basicConfig(level=logging.INFO)

    # Same model caveats as advanced_rag: reasoning models need max_tokens
    # headroom for thinking, and context_window must match the model.
    Settings.llm = OpenRouter(
        model="openai/gpt-5.4-nano", max_tokens=8192, context_window=400_000
    )
    Settings.embed_model = OpenAILikeEmbedding(
        model_name="openai/text-embedding-3-small",
        api_base="https://openrouter.ai/api/v1",
        api_key=os.environ["OPENROUTER_API_KEY"],
    )

    # Ingest: reuse the persisted index managed by manage_documents. The
    # sync is idempotent, so on most runs nothing is embedded at all.
    documents = SimpleDirectoryReader(str(DATA_DIR), filename_as_id=True).load_data()
    index = load_or_create_index()
    stats = sync_index(index, documents)
    if stats.inserted or stats.refreshed or stats.deleted:
        index.storage_context.persist(persist_dir=str(PERSIST_DIR))  # pyright: ignore[reportUnknownMemberType]
        logger.info(
            "synced store: +%d inserted, ~%d refreshed, -%d deleted",
            len(stats.inserted),
            len(stats.refreshed),
            len(stats.deleted),
        )
    logger.info("store has %d chunk(s)", len(index.docstore.docs))
    retriever = index.as_retriever(similarity_top_k=5)  # pyright: ignore[reportUnknownMemberType]

    # 1. Query generation
    queries = generate_queries(QUERY, NUM_GENERATED_QUERIES)
    logger.info("original query: %s", QUERY)
    for generated_query in queries[1:]:
        logger.info("generated     : %s", generated_query)

    # 2. Fan-out retrieval: one vector search per query
    result_lists: list[list[NodeWithScore]] = []
    for generated_query in queries:
        results = retriever.retrieve(generated_query)
        result_lists.append(results)
        log_stage(f"2. retrieve [{generated_query[:48]}]", results)

    # 3. Merge with reciprocal rank fusion — chunks surfaced by several
    # phrasings of the question outrank any single query's top hit.
    fused = reciprocal_rank_fusion(result_lists)[:FUSED_TOP_K]
    log_stage(f"3. RRF merge (top {FUSED_TOP_K})", fused)

    # 4. Synthesize the answer to the *original* question — the generated
    # queries were only ever a retrieval device.
    response = get_response_synthesizer().synthesize(QUERY, fused)
    print(response)


if __name__ == "__main__":
    main()
