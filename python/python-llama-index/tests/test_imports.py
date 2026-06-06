"""Hermetic tests — imports plus the pure/offline parts of the RAG pipeline."""

import pytest


def test_package_imports() -> None:
    import python_llama_index

    assert python_llama_index.__name__ == "python_llama_index"


def test_llama_index_integrations_import() -> None:
    from llama_index.embeddings.openai_like import (  # pyright: ignore[reportMissingTypeStubs]
        OpenAILikeEmbedding,
    )
    from llama_index.llms.openrouter import OpenRouter
    from llama_index.retrievers.bm25 import (  # pyright: ignore[reportMissingTypeStubs]
        BM25Retriever,
    )

    assert callable(OpenAILikeEmbedding)
    assert callable(OpenRouter)
    assert callable(BM25Retriever)


def test_reciprocal_rank_fusion_prefers_nodes_found_by_both_retrievers() -> None:
    from llama_index.core.schema import NodeWithScore, TextNode

    from python_llama_index.advanced_rag import reciprocal_rank_fusion

    a = NodeWithScore(node=TextNode(id_="a", text="a"), score=9.0)
    b = NodeWithScore(node=TextNode(id_="b", text="b"), score=0.1)
    c = NodeWithScore(node=TextNode(id_="c", text="c"), score=0.5)

    # "b" is ranked lower in both lists, but it is the only node in both —
    # RRF must put it first regardless of the original scores.
    fused = reciprocal_rank_fusion([[a, b], [c, b]])

    assert [item.node.node_id for item in fused][0] == "b"
    assert {item.node.node_id for item in fused} == {"a", "b", "c"}


def test_openrouter_rerank_maps_response_back_to_nodes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    import httpx
    from llama_index.core.schema import NodeWithScore, QueryBundle, TextNode

    from python_llama_index.advanced_rag import OpenRouterRerank

    captured: dict[str, object] = {}

    def fake_post(url: str, **kwargs: object) -> httpx.Response:
        captured["url"] = url
        captured["json"] = kwargs.get("json")
        return httpx.Response(
            200,
            json={
                "results": [
                    {"index": 2, "relevance_score": 0.97},
                    {"index": 0, "relevance_score": 0.41},
                ]
            },
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx, "post", fake_post)

    nodes = [
        NodeWithScore(node=TextNode(id_=letter, text=f"doc {letter}"))
        for letter in "abc"
    ]
    reranked = OpenRouterRerank(api_key="test-key", top_n=2).postprocess_nodes(
        nodes, QueryBundle(query_str="which doc?")
    )

    assert captured["url"] == "https://openrouter.ai/api/v1/rerank"
    sent = captured["json"]
    assert isinstance(sent, dict)
    assert sent["model"] == "cohere/rerank-4-pro"
    assert sent["documents"] == ["doc a", "doc b", "doc c"]
    assert [item.node.node_id for item in reranked] == ["c", "a"]
    assert reranked[0].score == 0.97
