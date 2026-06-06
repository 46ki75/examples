"""Hermetic smoke test — verifies the package and its integrations import."""


def test_package_imports() -> None:
    import python_llama_index

    assert python_llama_index.__name__ == "python_llama_index"


def test_llama_index_integrations_import() -> None:
    from llama_index.embeddings.openai_like import (  # pyright: ignore[reportMissingTypeStubs]
        OpenAILikeEmbedding,
    )
    from llama_index.llms.openrouter import OpenRouter

    assert callable(OpenAILikeEmbedding)
    assert callable(OpenRouter)
