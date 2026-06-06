# python-llama-index

LlamaIndex examples using OpenRouter for both the LLM
(`minimax/minimax-m2.7`) and embeddings (`openai/text-embedding-3-small`).

## Setup

```sh
cp .env.example .env   # then fill in OPENROUTER_API_KEY
uv sync
```

## Examples

| Module | What it shows |
| --- | --- |
| `python_llama_index.basic_llm` | Plain LLM completion + chat through LlamaIndex's `LLM` interface |
| `python_llama_index.basic_rag` | Load → index → query: `SimpleDirectoryReader`, `VectorStoreIndex`, query engine |
| `python_llama_index.advanced_rag` | Full pipeline: query rewrite → BM25 + vector search → RRF merge → cross-encoder rerank (`cohere/rerank-4-pro` via OpenRouter `/rerank`) → prev/next chunk expansion → synthesis |

Run (live — costs a few cents):

```sh
uv run --env-file .env python -m python_llama_index.basic_llm
uv run --env-file .env python -m python_llama_index.basic_rag
uv run --env-file .env python -m python_llama_index.advanced_rag
```

`data/` holds deliberately fictional documents so RAG answers must come from
retrieval, not the model's training data.
