# Chat Memory Update Plan

## Purpose

Chat memory gives each foreground chat or channel thread its own durable memory
scope. It should let Friday recall prior decisions and preferences for the
current chat without leaking unrelated chat context.

## Corpus Root

Use `memory/chats/<chatScope>/` in the agent workspace.

Suggested layout:

```text
memory/chats/
  <chatScope>/
    2026-05-24.md
    index.md
```

`chatScope` should be a stable filesystem-safe id derived from the chat route.
For connector chats, prefer a normalized value built from channel, account,
chat id, and thread id, plus a short hash when needed.

## Search Rules

- Foreground chat runs search global memory and the current chat memory by
  default.
- Chat memory results must include `scopeKind: "chat"` and the resolved
  `scopeId`.
- A chat can search wiki when the question is about stable workspace knowledge.
- A chat should search RAG only when source-grounded imported material is
  requested.
- One chat should not read another chat's memory unless the caller explicitly
  requests that scope and policy allows it.

## Write Rules

- Automatic flush appends to `memory/chats/<chatScope>/YYYY-MM-DD.md`.
- Root `MEMORY.md` stays reserved for curated cross-chat facts.
- Entries should capture durable facts, decisions, TODOs, and user preferences.
- Temporary one-turn context should stay in the session transcript, not chat
  memory.
- Sensitive values should require explicit user intent before storage.

## Entry Shape

Use human-readable Markdown entries:

```md
## 2026-05-24T14:00:00.000Z

- Decision: ...
- Preference: ...
- TODO: ...
```

The first pass can keep entries append-only. Later cleanup can deduplicate or
promote repeated facts into `MEMORY.md` or wiki pages.

## Implementation Phases

1. Add chat scope resolution from `channel` and `chatId`.
2. Add guarded path helpers for `memory/chats/<chatScope>/`.
3. Search global memory plus current chat memory by default.
4. Update pre-compaction flush to target the chat daily file.
5. Add result metadata for chat memory hits.
6. Add tests proving separate chats do not leak memory into each other.

## Verification

- Two chat ids produce different memory directories.
- Unsafe chat ids cannot escape `memory/chats/`.
- Compaction flush writes to the current chat daily file.
- A chat can still search global memory.
