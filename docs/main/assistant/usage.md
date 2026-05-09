# Usage

Two ways to use the Assistant: through the **registry** (production path — already wired), or by constructing one **directly** (tests, scripts, ad-hoc tools).

## 1. From the registry (the normal path)

A default assistant with id `'main'` is registered eagerly during bootstrap, so any subsystem in the main process can grab it from the service container.

`src/main/bootstrap.ts`:

```ts
const assistantRegistry = new AssistantRegistry();
assistantRegistry.create({
  id: DEFAULT_ASSISTANT_ID, // 'main'
  getApiKey: () => storeService.findProvider('openai')?.apiKey,
  getModel:  () => storeService.getAssistantService().llm.model,
  store: storeService,
  cron:  container.get<CronService>('cronService'),
});
container.register('assistantRegistry', assistantRegistry);
```

### From IPC (renderer → main)

`src/main/ipc/assistant-ipc.ts`:

```ts
const registry = container.get<AssistantRegistry>('assistantRegistry');

registerCommand(AssistantChannels.send, async (message, assistantId?) => {
  const assistant = registry.get(assistantId ?? DEFAULT_ASSISTANT_ID);
  return assistant.send(message);
});
```

The renderer calls `window.app.assistant.send('hi')`, this handler runs the loop and returns the text.

### From a channel adapter (Telegram, Discord, WhatsApp)

`src/main/channels/registry.ts` — inbound message → assistant → reply back on the same channel:

```ts
private async handleMessage(msg: ChannelInboundMessage): Promise<void> {
  const assistant = this.assistantRegistry.get(DEFAULT_ASSISTANT_ID);
  const reply = await assistant.send(msg.text);
  await this.send({ type: msg.type, to: msg.chatId, text: reply });
}
```

### From a task handler

A task handler that wants the assistant to do something just resolves it from the container:

```ts
class MyTaskHandler {
  constructor(private deps: { container: ServiceContainer }) {}

  async run(input: string): Promise<string> {
    const registry = this.deps.container.get<AssistantRegistry>('assistantRegistry');
    return registry.get(DEFAULT_ASSISTANT_ID).send(input);
  }
}
```

A dedicated assistant per task type — say you want a different memory workspace and tool set:

```ts
const summarizer = registry.create({
  id: 'summarizer',
  getApiKey: () => storeService.findProvider('openai')?.apiKey,
  tools: [new ReadFileTool(), new WriteFileTool()], // no exec, no cron
  maxIterations: 5,
});

await summarizer.send('Summarize the file at /tmp/notes.md');
```

## 2. Directly (tests, scripts, one-offs)

No registry, no container. Useful in unit tests or a debug command:

```ts
import { Assistant } from '@/main/assistant';

const assistant = new Assistant({
  id: 'scratch',
  getApiKey: () => process.env.OPENAI_API_KEY,
});

const reply = await assistant.send('hello');
console.log(reply);
```

`init()` runs lazily on first `send()` — workspace seeded, session log loaded.

To wipe state between runs:

```ts
await assistant.reset(); // clears session JSONL + memory workspace, re-seeds
```

## Cheat sheet

| Caller | Pattern |
|--------|---------|
| Renderer | `ipcRenderer.invoke('assistant:send', text)` → handled in `AssistantIpc` |
| Channel adapter | `registry.get(DEFAULT_ASSISTANT_ID).send(msg.text)` |
| Task handler | resolve `assistantRegistry` from container, `.get(id).send(...)` |
| Test / script | `new Assistant({ id, getApiKey }).send(...)` |
