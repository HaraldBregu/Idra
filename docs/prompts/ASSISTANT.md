# ASSISTANT Prompt

You are working on the Friday ASSISTANT subsystem. Keep changes small, match the existing Electron + TypeScript patterns, and do not add new abstractions unless the current assistant flow requires them.

## Goal

Maintain a conversational assistant that:

- initializes from the main process service container
- loads persistent memory and session history before answering
- reads provider, API key, and model from app settings
- sends messages through the existing assistant IPC channel
- waits for the assistant response before updating UI state
- broadcasts completed responses to renderer windows

## Dependencies

Required runtime dependencies already exist in `package.json`:

- `electron`
- `electron-vite`
- `openai`
- `react`
- `react-dom`

The assistant implementation depends on these local services:

- `StoreService`: reads the selected assistant provider, API key, and model
- `CronService`: provides cron-related assistant tools
- `MemoryManager`: seeds and reads assistant memory files
- `SessionManager`: persists assistant conversation history
- `runAgent`: executes the OpenAI chat completion loop and tool calls
- `defaultTools`: builds the tool list available to the assistant

## Initialization

Initialize the assistant in the main process during bootstrap.

1. Register `AssistantService` in `src/main/bootstrap.ts`.
2. Pass `{ store: storeService, cron: cronService }` as dependencies.
3. Use `DEFAULT_ASSISTANT_ID` as the default assistant id.
4. Register `AssistantIpc` so renderers can call the assistant through IPC.

Expected shape:

```ts
const assistant = container.register(
	'assistant',
	new AssistantService(
		{ store: storeService, cron: cronService },
		{ defaultAssistantId: DEFAULT_ASSISTANT_ID }
	)
);
```

`AssistantService` should eagerly create the default assistant, but each `Assistant` should initialize lazily on first use. `Assistant.init()` must:

- create the assistant workspace under Electron `userData`
- seed memory templates when missing
- initialize the session file
- load previous session messages into memory
- avoid duplicate initialization when concurrent sends happen

## Assistant Configuration

Before a message can be sent, the app must have:

- selected assistant provider
- configured provider API key
- selected model

The assistant reads these through `StoreService.getAssistantService()` and `StoreService.getProviderById()`.

If any value is missing, return a clear error:

- assistant provider not configured
- provider record not found
- provider API key missing
- assistant model missing

## Run The App

Install dependencies if needed:

```bash
yarn install
```

Run the Electron app in development:

```bash
yarn dev
```

Configure the assistant in the app settings before sending a message:

1. Open Settings.
2. Select the assistant provider.
3. Add the provider API key.
4. Select the assistant model.

## Send A Message And Wait For Response

From renderer code, use the preload API. The call must be awaited before adding the assistant reply to UI state.

```ts
const response = await window.app.assistant.send('Hello');
```

Recommended renderer service wrapper:

```ts
export interface AssistantReply {
	readonly content: string;
}

export async function sendMessage(prompt: string): Promise<AssistantReply> {
	const content = await window.app.assistant.send(prompt);
	return { content };
}
```

Recommended UI flow:

```ts
dispatch({ type: 'append-user-message', message: prompt });
dispatch({ type: 'set-sending', sending: true });

try {
	const reply = await sendMessage(prompt);
	dispatch({ type: 'append-assistant-message', message: reply.content });
} finally {
	dispatch({ type: 'set-sending', sending: false });
}
```

## IPC Contract

Use the existing assistant channels:

- `assistant:send`: invoke with `(message: string, assistantId?: string)` and return `string`
- `assistant:reset`: invoke with `(assistantId?: string)` and return `void`
- `assistant:response`: event sent after a reply lands

Main process send flow:

1. `AssistantIpc` receives `assistant:send`.
2. It resolves `AssistantService` from the container.
3. It calls `assistant.send(message, assistantId)`.
4. `Assistant.send()` initializes memory/session if needed.
5. It builds the system prompt.
6. It resolves API key and model from settings.
7. It runs the agent loop.
8. It appends new messages to the session.
9. It returns assistant text to the caller.
10. It broadcasts `assistant:response` to renderer windows.

## Reset Conversation

Renderer:

```ts
await window.app.assistant.reset();
```

Main process behavior:

- clear persisted session history
- clear assistant memory workspace
- reset in-memory history
- initialize again with seeded templates

## Verification

After assistant changes, run:

```bash
yarn typecheck
```

For manual verification:

1. Start the app with `yarn dev`.
2. Configure provider, API key, and model in Settings.
3. Send a message from the Assistant page.
4. Confirm the UI waits while the request is pending.
5. Confirm the assistant reply appears once the promise resolves.
6. Restart the app and confirm prior session history is loaded.
