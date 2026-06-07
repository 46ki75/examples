# python-llama-index

LlamaIndex examples using OpenRouter for both the LLM
(`openai/gpt-5.4-nano`) and embeddings (`openai/text-embedding-3-small`).

## Setup

```sh
cp .env.example .env   # then fill in OPENROUTER_API_KEY
uv sync
```

## Examples

| Module | What it shows |
| --- | --- |
| `python_llama_index.advanced_rag` | Full pipeline: query rewrite → BM25 + vector search → RRF merge → cross-encoder rerank (`cohere/rerank-4-pro` via OpenRouter `/rerank`) → prev/next chunk expansion → synthesis |
| `python_llama_index.rag_fusion` | RAG-Fusion: LLM generates multiple phrasings of the question → one vector search per query → RRF merge across the result lists → synthesis of the original question. Fuses across *queries* where `advanced_rag` fuses across *retrievers* |
| `python_llama_index.manage_documents` | Idempotent document sync: persisted index in `storage/`, hash-based change detection, only new/edited files are embedded, deleted files are removed. Owns ingestion config (chunking); `advanced_rag` and `rag_fusion` reuse this store |

Run (live — costs a few cents):

```sh
uv run --env-file .env python -m python_llama_index.manage_documents
uv run --env-file .env python -m python_llama_index.advanced_rag
uv run --env-file .env python -m python_llama_index.rag_fusion
```

`data/` holds deliberately fictional documents so RAG answers must come from
retrieval, not the model's training data.
