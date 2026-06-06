"""Step 2: minimal RAG — load documents, embed them, query with an LLM.

The core LlamaIndex pipeline:

    SimpleDirectoryReader  ->  Document objects
    VectorStoreIndex       ->  chunks + embeds them (in-memory vector store)
    as_query_engine()      ->  retrieve top-k chunks, synthesize an answer

Both the LLM and the embedding model go through OpenRouter, configured
globally via `Settings` so every downstream component picks them up.

Run:
    uv run --env-file .env python -m python_llama_index.basic_rag
"""

import logging
import os
from pathlib import Path

from llama_index.core import Settings, SimpleDirectoryReader, VectorStoreIndex
from llama_index.embeddings.openai_like import (  # pyright: ignore[reportMissingTypeStubs]
    OpenAILikeEmbedding,
)
from llama_index.llms.openrouter import OpenRouter

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"


def main() -> None:
    logging.basicConfig(level=logging.INFO)

    # Global defaults — used by VectorStoreIndex (embed) and the query engine (LLM)
    # context_window matters: the wrapper defaults to ~3.9k tokens, and the
    # query engine budgets its prompt as (context_window - max_tokens).
    Settings.llm = OpenRouter(
        model="openai/gpt-5.4-nano", max_tokens=8192, context_window=204_800
    )
    Settings.embed_model = OpenAILikeEmbedding(
        model_name="openai/text-embedding-3-small",
        api_base="https://openrouter.ai/api/v1",
        api_key=os.environ["OPENROUTER_API_KEY"],
    )

    # 1. Load: every file in data/ becomes one or more Document objects
    documents = SimpleDirectoryReader(str(DATA_DIR)).load_data()
    logger.info("loaded %d document(s)", len(documents))

    # 2. Index: chunk the documents and embed each chunk (in-memory)
    index = VectorStoreIndex.from_documents(documents, show_progress=True)

    # 3. Query: retrieve the most relevant chunks, then ask the LLM
    query_engine = index.as_query_engine()  # pyright: ignore[reportUnknownMemberType]
    response = query_engine.query("What is Kestrel Station and who operates it?")
    print(response)

    # Inspect which chunks were retrieved (the "R" in RAG)
    for node in response.source_nodes:
        logger.info("source (score=%.3f): %s...", node.score or 0.0, node.text[:80])


if __name__ == "__main__":
    main()
