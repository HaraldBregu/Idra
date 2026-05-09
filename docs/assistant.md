# Assistant

The assistant is Friday's main-process conversational assistant. It accepts a user message, builds a system prompt from markdown memory files, runs a tool-calling loop, persists the new messages, and returns text.

Source: `src/main/assistant/`.

## Main pieces

- `assistant.ts` owns the public `Assistant` class.
- `registry.ts` stores assistants by id and exposes `create`, `register`, `get`, `has`, and `list`.
- `memory.ts` manages per-assistant markdown memory under `userData/assistant/workspaces/<id>/`.
- `session.ts` persists chat history for each assistant session.
- `loop.ts` runs the ReAct-style Chat Completions loop.
- `tools/` contains the built-in file, shell, cron, provider, and channel tools.

## Lifecycle

The default assistant is registered during bootstrap in `src/main/bootstrap.ts` with id `main`.

```ts
const assistantRegistry = new AssistantRegistry();
assistantRegistry.create({
	id: DEFAULT_ASSISTANT_ID,
	getApiKey: () => {
		const ref = storeService.getAssistantService().llm;
		const resolved = storeService.resolveProviderRef(ref);
		if (resolved?.provider.apiKey) return resolved.provider.apiKey;
		return storeService.findProvider('openai')?.apiKey;
	},
	getModel: () => {
		const ref = storeService.getAssistantService().llm;
		const resolved = storeService.resolveProviderRef(ref);
		return ref.model || resolved?.model || storeService.findProvider('openai')?.defaultModel || '';
	},
	store: storeService,
	cron: container.get<CronService>('cronService'),
});
container.register('assistantRegistry', assistantRegistry);
```

`Assistant.send()` initializes lazily on first use:

1. Seeds the markdown memory workspace from `src/main/assistant/templates/*.md`.
2. Loads persisted session messages.
3. Builds the system prompt from the memory files.
4. Runs the model loop with the configured tools.
5. Appends only the new messages to session history.

`Assistant.reset()` clears the session and memory workspace, then reinitializes the assistant.

## Calling it

Renderer code calls the preload API, which reaches `AssistantIpc`:

```ts
const reply = await window.app.assistant.send('hello');
```

The IPC handler resolves the assistant from the registry and broadcasts the response to all windows:

```ts
registerCommand(AssistantChannels.send, async (message: string, assistantId?: string) => {
	const id = assistantId ?? DEFAULT_ASSISTANT_ID;
	const assistant = registry.get(id);
	const response = await assistant.send(message);

	for (const win of BrowserWindow.getAllWindows()) {
		win.webContents.send(AssistantChannels.response, { assistantId: id, userMessage: message, response });
	}

	return response;
});
```

Channel adapters use the same registry path. An inbound Telegram, Discord, or WhatsApp message is sent to the default assistant and the reply is sent back through the same channel.

Task handlers can also resolve `assistantRegistry` from the service container and call `registry.get(DEFAULT_ASSISTANT_ID).send(input)`.

For tests or scripts, construct an assistant directly:

```ts
const assistant = new Assistant({
	id: 'scratch',
	getApiKey: () => process.env.OPENAI_API_KEY,
});

const reply = await assistant.send('hello');
```

## Configuration

`AssistantOptions` supports:

- `id`: assistant id and memory workspace name.
- `model`: fallback model when no dynamic model is provided.
- `getApiKey`: function that returns the runtime API key.
- `getModel`: optional function that returns the runtime model.
- `tools`: explicit tool list. Passing `[]` disables tools.
- `store`: enables provider and channel settings tools when default tools are used.
- `cron`: enables cron tools when default tools are used.
- `sessionKey`: persisted session key. Defaults to `assistant:<id>`.
- `maxIterations`: maximum model/tool loop iterations. Defaults to `20`.

Default tools include `read_file`, `write_file`, and `exec`. Supplying `store` adds provider and channel configuration tools. Supplying `cron` adds cron scheduling tools.

## Markdown Memory

Each assistant has a markdown memory workspace at:

```text
userData/assistant/workspaces/<id>/
```

The workspace is seeded with:

- `AGENTS.md`
- `BOOTSTRAP.md`
- `HEARTBEAT.md`
- `MEMORY.md`
- `SOUL.md`
- `USER.md`

`buildSystemPrompt()` reads non-empty memory files and wraps each one in a tag named after the file stem, such as `<memory>...</memory>`. The prompt also includes the current UTC date/time and the absolute memory workspace path.
