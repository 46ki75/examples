"""Hermetic tests for the idempotent index sync — MockEmbedding, no network."""

from llama_index.core import Document, VectorStoreIndex
from llama_index.core.embeddings import MockEmbedding

from python_llama_index.manage_documents import sync_index


def make_index() -> VectorStoreIndex:
    return VectorStoreIndex([], embed_model=MockEmbedding(embed_dim=8))


def test_sync_inserts_then_is_idempotent() -> None:
    index = make_index()
    docs = [Document(text="alpha", id_="a.md"), Document(text="beta", id_="b.md")]

    first = sync_index(index, docs)
    assert first.inserted == ["a.md", "b.md"]
    assert not first.refreshed and not first.deleted and not first.unchanged

    # The whole point: syncing the same documents again does nothing
    second = sync_index(index, docs)
    assert second.unchanged == ["a.md", "b.md"]
    assert not second.inserted and not second.refreshed and not second.deleted


def test_sync_refreshes_changed_and_deletes_missing() -> None:
    index = make_index()
    sync_index(
        index,
        [Document(text="alpha", id_="a.md"), Document(text="beta", id_="b.md")],
    )

    # a.md was edited, b.md was removed from the source directory
    stats = sync_index(index, [Document(text="alpha v2", id_="a.md")])

    assert stats.refreshed == ["a.md"]
    assert stats.deleted == ["b.md"]
    assert not stats.inserted and not stats.unchanged
    assert set(index.ref_doc_info) == {"a.md"}
