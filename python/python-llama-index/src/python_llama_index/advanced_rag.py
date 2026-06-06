"""A full-featured RAG pipeline, stage by stage.

Production RAG is rarely just "embed and retrieve". This example wires the
classic pipeline explicitly so every stage is visible and logged:

    1.  Query transformation - an LLM rewrites the raw user query for recall
    2a. Lexical search       - BM25 keyword matching over chunk text
    2b. Semantic search      - embedding similarity (vector store)
    3.  Merge                - reciprocal rank fusion (RRF) of both lists
    4.  Rerank               - a cross-encoder model re-scores candidates
                               (cohere/rerank-4-pro via OpenRouter /rerank)
    5.  Expand               - neighbouring chunks are pulled in for context
    6.  Synthesize           - the LLM answers from the final chunk set

Ingestion is delegated to `manage_documents`: this module loads the
persisted index from storage/ and runs an idempotent sync, so unchanged
files are never re-embedded. Chunking config lives there too — chunks are
made at ingestion time, not query time.

Run:
    uv run --env-file .env python -m python_llama_index.advanced_rag
"""

import logging
import os
from collections import defaultdict
from typing import Any

import httpx
from llama_index.core import (
    Settings,
    SimpleDirectoryReader,
    get_response_synthesizer,  # pyright: ignore[reportUnknownVariableType]
)
from llama_index.core.postprocessor import PrevNextNodePostprocessor
from llama_index.core.postprocessor.types import BaseNodePostprocessor
from llama_index.core.schema import NodeWithScore, QueryBundle
from llama_index.embeddings.openai_like import (  # pyright: ignore[reportMissingTypeStubs]
    OpenAILikeEmbedding,
)
from llama_index.llms.openrouter import OpenRouter
from llama_index.retrievers.bm25 import (  # pyright: ignore[reportMissingTypeStubs]
    BM25Retriever,
)

from python_llama_index.manage_documents import (
    DATA_DIR,
    PERSIST_DIR,
    load_or_create_index,
    sync_index,
)

logger = logging.getLogger(__name__)

QUERY = "How does the station stay powered through the polar night?"

REWRITE_PROMPT = (
    "Rewrite the following search query to maximize retrieval recall: expand "
    "abbreviations and add likely synonyms, as a single line of search terms. "
    "Return only the rewritten query.\n"
    "Query: {query}\n"
    "Rewritten:"
)


class OpenRouterRerank(BaseNodePostprocessor):
    """Stage 4: rerank with a purpose-built cross-encoder via OpenRouter.

    LlamaIndex ships no postprocessor for OpenRouter's ``/api/v1/rerank``
    endpoint, but writing one only takes subclassing
    ``BaseNodePostprocessor``. Unlike ``LLMRerank`` (which prompts a chat
    model and parses its text reply), a rerank model scores each
    (query, document) pair directly — faster, cheaper (~$0.0025/search),
    and immune to output-format parsing failures.
    """

    model: str = "cohere/rerank-4-pro"
    top_n: int = 3
    api_base: str = "https://openrouter.ai/api/v1"
    api_key: str

    @classmethod
    def class_name(cls) -> str:
        return "OpenRouterRerank"

    def _postprocess_nodes(
        self,
        nodes: list[NodeWithScore],
        query_bundle: QueryBundle | None = None,
    ) -> list[NodeWithScore]:
        if query_bundle is None:
            raise ValueError("query_bundle is required")
        if not nodes:
            return []
        response = httpx.post(
            f"{self.api_base}/rerank",
            headers={"Authorization": f"Bearer {self.api_key}"},
            json={
                "model": self.model,
                "query": query_bundle.query_str,
                "documents": [item.node.get_content() for item in nodes],
                "top_n": self.top_n,
            },
            timeout=60.0,
        )
        response.raise_for_status()
        results: list[dict[str, Any]] = response.json()["results"]
        return [
            NodeWithScore(
                node=nodes[int(result["index"])].node,
                score=float(result["relevance_score"]),
            )
            for result in results
        ]


def transform_query(query: str) -> str:
    """Stage 1: let the LLM rewrite the query before retrieval.

    Falls back to the original query if the rewrite comes back empty —
    reasoning models can burn the whole ``max_tokens`` budget on thinking
    and return no visible text, and a recall helper must never be able to
    break retrieval outright.
    """
    rewritten = Settings.llm.complete(REWRITE_PROMPT.format(query=query)).text.strip()
    if not rewritten:
        logger.warning("query rewrite came back empty; keeping the original query")
        return query
    return rewritten


def reciprocal_rank_fusion(
    result_lists: list[list[NodeWithScore]], k: int = 60
) -> list[NodeWithScore]:
    """Stage 3: merge ranked lists without comparing their incompatible scores.

    BM25 scores and cosine similarities live on different scales, so RRF
    ignores scores entirely: each node earns 1 / (k + rank) per list it
    appears in, and nodes found by *both* retrievers float to the top.
    """
    fused_scores: defaultdict[str, float] = defaultdict(float)
    by_id: dict[str, NodeWithScore] = {}
    for results in result_lists:
        for rank, item in enumerate(results):
            node_id = item.node.node_id
            fused_scores[node_id] += 1.0 / (k + rank + 1)
            by_id.setdefault(node_id, item)
    return [
        NodeWithScore(node=by_id[node_id].node, score=score)
        for node_id, score in sorted(
            fused_scores.items(), key=lambda pair: pair[1], reverse=True
        )
    ]


def log_stage(stage: str, nodes: list[NodeWithScore]) -> None:
    """Print one line per chunk so each stage's effect is visible."""
    logger.info("%s -> %d chunk(s)", stage, len(nodes))
    for item in nodes:
        snippet = " ".join(item.node.get_content().split())[:72]
        logger.info("  score=%.4f | %s...", item.score or 0.0, snippet)


def main() -> None:
    logging.basicConfig(level=logging.INFO)

    # NOTE: MiniMax M2.x are reasoning models — thinking tokens count
    # against max_tokens, so give them room or .text may come back empty.
    # context_window must be set too: the wrapper defaults to ~3.9k and
    # the synthesizer's prompt budget (window - max_tokens) goes negative.
    Settings.llm = OpenRouter(
        model="openai/gpt-5.4-nano", max_tokens=8192, context_window=204_800
    )
    Settings.embed_model = OpenAILikeEmbedding(
        model_name="openai/text-embedding-3-small",
        api_base="https://openrouter.ai/api/v1",
        api_key=os.environ["OPENROUTER_API_KEY"],
    )

    # Ingest: reuse the persisted index managed by manage_documents. The
    # sync is idempotent, so on most runs nothing is embedded at all —
    # only new or edited files in data/ cost API calls. The store's
    # docstore keeps the chunk nodes and their prev/next relationships,
    # which stage 5 and BM25 both need.
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
    docstore = index.docstore
    logger.info("store has %d chunk(s)", len(docstore.docs))
    vector_retriever = index.as_retriever(similarity_top_k=5)  # pyright: ignore[reportUnknownMemberType]
    bm25_retriever = BM25Retriever.from_defaults(  # pyright: ignore[reportUnknownMemberType]
        docstore=docstore, similarity_top_k=5
    )

    # 1. Query transformation
    rewritten = transform_query(QUERY)
    logger.info("original query : %s", QUERY)
    logger.info("rewritten query: %s", rewritten)

    # 2a + 2b. Lexical and semantic search over the rewritten query
    lexical = bm25_retriever.retrieve(rewritten)
    semantic = vector_retriever.retrieve(rewritten)
    log_stage("2a. BM25 (lexical)", lexical)
    log_stage("2b. vector (semantic)", semantic)

    # 3. Merge with reciprocal rank fusion
    merged = reciprocal_rank_fusion([lexical, semantic])
    log_stage("3. RRF merge", merged)

    # 4. Rerank: a cross-encoder scores each candidate against the
    # *original* query (not the recall-oriented rewrite) and keeps the
    # best 3. The chat-model alternative is
    # llama_index.core.postprocessor.LLMRerank.
    query_bundle = QueryBundle(query_str=QUERY)
    reranked = OpenRouterRerank(
        api_key=os.environ["OPENROUTER_API_KEY"], top_n=3
    ).postprocess_nodes(merged, query_bundle)
    log_stage("4. cross-encoder rerank", reranked)

    # 5. Expand: small chunks are precise to retrieve but thin to read, so
    # pull each survivor's neighbouring chunks back in from the docstore.
    expanded = PrevNextNodePostprocessor(
        docstore=docstore, num_nodes=1, mode="both"
    ).postprocess_nodes(reranked, query_bundle)
    log_stage("5. prev/next expansion", expanded)

    # 6. Synthesize the final answer from the expanded chunk set
    response = get_response_synthesizer().synthesize(QUERY, expanded)
    print(response)


if __name__ == "__main__":
    main()
