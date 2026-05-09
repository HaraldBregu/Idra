# Overview

## Purpose

Personal AI assistant living in Electron main process. One `Assistant` = one identity (id), one workspace, one session log. Multiple assistants coexist via `AssistantRegistry`.

## Runtime layout

Per-assistant data on disk under Electron `userData`:

```
<userData>/assistant/
├── workspaces/<id>/        ← MemoryManager
│   ├── AGENTS.md           seeded from src/main/assistant/templates/
│   ├── BOOTSTRAP.md        re-seeded only on fresh workspace (no SOUL.md)
│   ├── HEARTBEAT.md
│   ├── MEMORY.md
│   ├── USER.md
│   └── SOUL.md             written by assistant; presence = workspace exists
└── sessions/<sessionKey>.jsonl   ← SessionManager (default `assistant:<id>`)
```

Templates are bundled at build time via `import.meta.glob('./templates/*.md', { query: '?raw', eager: true })` so the renderer/main bundle ships them — no runtime fs lookup of source tree.

## Data flow per `send(userMessage)`

1. Lazy `init()`: create workspace dir, seed templates, load session JSONL → in-memory `history`.
2. `buildSystemPrompt(memory)` reads all populated memory files, wraps each in `<tag>...</tag>`, prepends ambient context (UTC timestamp, workspace path, channel/chatId if set).
3. `runAgent({ ... })` — ReAct loop:
   - call `chat.completions.create` with `{ system, ...history, user }` and tool schemas
   - if assistant returns `tool_calls`, execute each via `Tool.execute(args)`, append `role:'tool'` results, loop
   - else return text
4. Append the new turn's messages to session JSONL and in-memory history.

## Key invariants

- **OpenAI tool pairing.** Every `role:'tool'` must be preceded by an assistant message with matching `tool_calls[].id`. `SessionManager.load` runs `sanitizeHistory` to drop orphans before sending.
- **Lazy client.** OpenAI client cached, rebuilt on key change (`getApiKey()` is called each `send`).
- **Model resolution per turn.** `getModel?.()` is called inside the loop on every iteration via `model: () => this.currentModel()` — model can change mid-session.
- **Default tools depend on injected services.** No `cron`/`store` injected → fewer tools. Pass `tools: []` to disable entirely.

## Where it's wired

`src/main/assistant/index.ts` re-exports the public surface. The constructor for an assistant lives in `src/main/index.ts` / `bootstrap.ts` (search for `new Assistant` or `AssistantRegistry`).
