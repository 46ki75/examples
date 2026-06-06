"""Document store management — sync data/ into a persisted index, idempotently.

Naive RAG rebuilds (and re-embeds) the whole index on every run. Real
systems treat the index as a long-lived store and *sync* it against the
source of truth instead:

    new file       -> embedded and inserted
    edited file    -> old chunks deleted, new content re-embedded
    deleted file   -> its chunks removed from the index
    unchanged file -> untouched: no embedding API calls, no cost

Running this script twice in a row is a no-op the second time — that is the
idempotency contract. Try it: run once (everything inserted), run again
(everything unchanged), edit one file in data/ and run a third time (only
that file is refreshed).

The moving parts:

    SimpleDirectoryReader(filename_as_id=True)  -> stable document IDs
    document hashes in the docstore             -> change detection
    index.refresh_ref_docs() / delete_ref_doc() -> targeted mutation
    StorageContext / load_index_from_storage    -> persistence in storage/

Run:
    uv run --env-file .env python -m python_llama_index.manage_documents
"""

import logging
import os
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

from llama_index.core import (
    Document,
    Settings,
    SimpleDirectoryReader,
    StorageContext,
    VectorStoreIndex,
    load_index_from_storage,  # pyright: ignore[reportUnknownVariableType]
)
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import TransformComponent
from llama_index.embeddings.openai_like import (  # pyright: ignore[reportMissingTypeStubs]
    OpenAILikeEmbedding,
)

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).resolve().parents[2] / "data"
PERSIST_DIR = Path(__file__).resolve().parents[2] / "storage"

# Chunking happens at ingestion time, so the splitter lives here — every
# consumer of the store (e.g. advanced_rag) inherits these chunks. Small
# chunks retrieve precisely; query pipelines re-attach context afterwards
# with prev/next expansion.
TRANSFORMATIONS: list[TransformComponent] = [
    SentenceSplitter(chunk_size=128, chunk_overlap=16)
]


@dataclass
class SyncStats:
    """What a sync run did, by document ID."""

    inserted: list[str]
    refreshed: list[str]
    deleted: list[str]
    unchanged: list[str]


def sync_index(index: VectorStoreIndex, documents: Sequence[Document]) -> SyncStats:
    """Mutate ``index`` so it mirrors ``documents``, touching only what changed.

    Idempotent: syncing the same documents twice performs no work the
    second time, because each document's content hash is stored in the
    docstore and compared before any embedding happens.
    """
    known_before = set(index.ref_doc_info)
    current_ids = {doc.doc_id for doc in documents}

    # Remove documents that no longer exist in the source
    deleted = sorted(known_before - current_ids)
    for ref_doc_id in deleted:
        index.delete_ref_doc(ref_doc_id, delete_from_docstore=True)

    # Insert new documents and re-embed changed ones (hash comparison);
    # unchanged documents are skipped entirely.
    changed_flags = index.refresh_ref_docs(list(documents))

    inserted: list[str] = []
    refreshed: list[str] = []
    unchanged: list[str] = []
    for doc, was_changed in zip(documents, changed_flags, strict=True):
        if not was_changed:
            unchanged.append(doc.doc_id)
        elif doc.doc_id in known_before:
            refreshed.append(doc.doc_id)
        else:
            inserted.append(doc.doc_id)

    return SyncStats(
        inserted=inserted, refreshed=refreshed, deleted=deleted, unchanged=unchanged
    )


def load_or_create_index() -> VectorStoreIndex:
    """Load the persisted index from storage/, or start an empty one."""
    if PERSIST_DIR.exists():
        index = load_index_from_storage(  # pyright: ignore[reportUnknownVariableType]
            StorageContext.from_defaults(persist_dir=str(PERSIST_DIR)),
            transformations=TRANSFORMATIONS,
        )
        assert isinstance(index, VectorStoreIndex)
        logger.info("loaded existing index from %s", PERSIST_DIR)
        return index
    logger.info("no index at %s yet; starting empty", PERSIST_DIR)
    return VectorStoreIndex([], transformations=TRANSFORMATIONS)


def main() -> None:
    logging.basicConfig(level=logging.INFO)

    # Syncing only needs the embedder — no LLM is ever called here.
    Settings.embed_model = OpenAILikeEmbedding(
        model_name="openai/text-embedding-3-small",
        api_base="https://openrouter.ai/api/v1",
        api_key=os.environ["OPENROUTER_API_KEY"],
    )

    # filename_as_id=True makes the file path the document ID, so the same
    # file maps to the same document across runs — the key to idempotency.
    documents = SimpleDirectoryReader(str(DATA_DIR), filename_as_id=True).load_data()

    index = load_or_create_index()
    stats = sync_index(index, documents)

    for label, ids in (
        ("inserted", stats.inserted),
        ("refreshed", stats.refreshed),
        ("deleted", stats.deleted),
        ("unchanged", stats.unchanged),
    ):
        logger.info("%-9s %d  %s", label, len(ids), [Path(i).name for i in ids])

    index.storage_context.persist(persist_dir=str(PERSIST_DIR))  # pyright: ignore[reportUnknownMemberType]
    logger.info("persisted index to %s", PERSIST_DIR)


if __name__ == "__main__":
    main()
