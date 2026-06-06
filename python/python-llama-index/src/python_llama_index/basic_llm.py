"""Step 1: call an LLM through LlamaIndex — no RAG yet.

LlamaIndex wraps every provider behind one `LLM` interface. Here we use
OpenRouter (OpenAI-compatible), which reads OPENROUTER_API_KEY from the
environment.

Run:
    uv run --env-file .env python -m python_llama_index.basic_llm
"""

import logging

from llama_index.core.llms import ChatMessage
from llama_index.llms.openrouter import OpenRouter

logger = logging.getLogger(__name__)

MODEL = "openai/gpt-5.4-nano"


def main() -> None:
    logging.basicConfig(level=logging.INFO)

    # Reasoning models spend "thinking" tokens out of max_tokens too —
    # keep the budget generous or .text may come back empty.
    llm = OpenRouter(model=MODEL, max_tokens=8192, context_window=204_800)

    # One-shot completion
    completion = llm.complete("In one sentence, what is LlamaIndex?")
    print(completion.text)

    # Chat-style with message history
    messages = [
        ChatMessage(role="system", content="You answer in exactly one short sentence."),
        ChatMessage(role="user", content="What is a vector index?"),
    ]
    chat_response = llm.chat(messages)
    print(chat_response.message.content)


if __name__ == "__main__":
    main()
