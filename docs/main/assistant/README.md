# Assistant

Conversational AI assistant in main process. ReAct-style tool loop over OpenAI Chat Completions, with persistent markdown memory and append-only session history.

Source: `src/main/assistant/`.

## Pages

- [Overview](./overview.md) — what it is, runtime layout, data flow
- [Architecture](./architecture.md) — modules, lifecycle, message flow
- [Memory](./memory.md) — `MemoryManager`, templates, system prompt
- [Sessions](./sessions.md) — `SessionManager`, JSONL log, sanitizer
- [Loop](./loop.md) — `runAgent` ReAct loop
- [Tools](./tools.md) — built-in tools, adding new ones
- [Registry](./registry.md) — multi-assistant registry
- [API](./api.md) — public exports and types

## TL;DR

```ts
import { Assistant } from '@/main/assistant';

const a = new Assistant({
  id: 'main',
  getApiKey: () => store.get('openai.apiKey'),
  getModel: () => store.get('openai.model'),
  cron: cronService,   // optional → enables cron_* tools
  store: storeService, // optional → enables provider/channel tools
});

const reply = await a.send('hello');
```

Lazy-init: memory + session bootstrap on first `send()`. Default model `gpt-4o-mini`. Default `maxIterations` 20.
