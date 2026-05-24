# OpenClaw Memory Implementation

Scraped from `/Users/haraldbregu/Documents/analyze/openclaw` on 2026-05-24.

This folder documents how OpenClaw implements memory at the source level. It is
about OpenClaw's implementation, not Friday's local memory runtime.

## Documents

- [Implementation Flow](./implementation-flow.md) - step-by-step runtime path from files on disk to prompt recall.
- [Source Map](./source-map.md) - key OpenClaw files and what each one owns.

## High-Level Model

OpenClaw memory is file-backed first. The durable user-facing state lives in the
agent workspace:

- `MEMORY.md` for curated long-term facts and preferences.
- `memory/YYYY-MM-DD.md` for daily working memory.
- `DREAMS.md` and `memory/.dreams/` for optional dreaming and promotion state.

The default active memory plugin is `memory-core`. It registers:

- the memory runtime capability used by core code,
- the `memory_search` and `memory_get` tools,
- prompt guidance that tells the agent when to use those tools,
- the pre-compaction memory flush plan,
- optional dreaming consolidation.

The active backend is resolved at runtime:

- `builtin` uses a per-agent SQLite index with FTS5, embeddings, optional
  `sqlite-vec`, hybrid search, watches, and session transcript indexing.
- `qmd` uses a local QMD sidecar with managed collections, subprocess updates,
  optional MCP access through `mcporter`, reranking/query expansion modes, and
  builtin fallback if QMD cannot run.

OpenClaw also has a separate `active-memory` plugin. It is not the storage
backend. It is a proactive recall layer that runs a small blocking sub-agent
before eligible chat replies and injects a hidden untrusted memory summary into
the next prompt.

