# Memory

Friday memory is planned as a file-backed system with scoped recall for chats,
background tasks, scheduled work, RAG corpora, and wiki knowledge.

## Documents

- [Implementation Plan](./implementation-plan.md) - phased plan for scoped
  chat, task, cron, RAG, and wiki memory.
- [RAG](./rag/index.md) - retrieval corpus plan for imported documents and
  source-grounded results.
- [Wiki](./wiki/index.md) - curated knowledge-base plan for durable workspace
  knowledge.

## Working Model

The durable source of truth should remain Markdown in the agent workspace:

- `MEMORY.md` for curated agent/user-level long-term memory.
- `memory/chats/<scope>/YYYY-MM-DD.md` for chat-specific memory.
- `memory/tasks/<taskId>/YYYY-MM-DD.md` for background task memory.
- `memory/cron/<jobId>/YYYY-MM-DD.md` for scheduled-job memory.
- `memory/rag/` for imported retrieval corpora.
- `memory/wiki/` for curated workspace knowledge.

Runtime indexes and search tools can cache or rank those files, but the user
should be able to inspect and edit the durable memory files directly.
