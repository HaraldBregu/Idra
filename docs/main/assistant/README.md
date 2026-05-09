# Assistant

The Assistant is Friday's conversational brain. You send it a message, it replies. It remembers things between turns, can run tools (read/write files, run shell, schedule crons, configure providers and channels), and persists its history to disk.

Source: `src/main/assistant/`.

## How it fits

- Lives in the Electron **main process** (not the renderer).
- Talks to OpenAI Chat Completions.
- Each assistant has an **id**, a **markdown workspace** for memory, and a **JSONL log** for session history.
- Multiple assistants can coexist via a registry.

## Quick example

```ts
import { Assistant } from '@/main/assistant';

const a = new Assistant({
  id: 'main',
  getApiKey: () => store.get('openai.apiKey'),
});

const reply = await a.send('hello');
```

That's it for the basics. Deeper docs to be added as needed.
