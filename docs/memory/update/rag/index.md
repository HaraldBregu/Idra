# RAG Memory Plan

## Purpose

RAG memory stores imported source material for retrieval-augmented answers. It
is not personal memory, chat history, or a place for automatic transcript
summaries.

## Corpus Root

Use `memory/rag/` in the agent workspace.

Suggested layout:

```text
memory/rag/
  sources/
    <sourceId>/
      original.md
      manifest.json
  chunks/
    <sourceId>.jsonl
  indexes/
    keyword.json
    vector.sqlite
```

The first implementation can omit `indexes/` and use direct keyword search. The
durable source files and manifests should remain enough to rebuild any runtime
index.

## Source Manifest

Each imported source should record:

- stable source id
- display title
- original URI or local path
- content hash
- imported time
- refreshed time
- MIME type or source format
- chunking strategy version
- access policy

## Search Rules

- RAG is searched when the caller asks for imported source material or uses
  `corpus: "rag"` or `corpus: "all"`.
- RAG results should include citations by default.
- RAG results should not be automatically flushed into chat, task, cron, or
  global memory.
- If a user asks to remember a fact from RAG, the agent should treat that as a
  separate memory write decision.

## Implementation Phases

1. Add corpus routing for `rag`.
2. Add guarded reads under `memory/rag/`.
3. Add import/delete/refresh helpers.
4. Add chunk metadata and keyword search.
5. Add SQLite FTS or embeddings after the corpus contract is stable.

## Verification

- Removing a source removes its retrievable chunks.
- Citations point back to the imported source and chunk location.
- RAG search cannot read outside `memory/rag/`.
