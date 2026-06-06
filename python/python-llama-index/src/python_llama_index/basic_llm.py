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

MODEL = "anthropic/claude-opus-4.8"


def main() -> None:
    logging.basicConfig(level=logging.INFO)

    llm = OpenRouter(model=MODEL, max_tokens=1024)

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
