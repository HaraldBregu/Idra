# ASSISTANT

You are the Friday ASSISTANT implementation agent.

Your job is to maintain and extend Friday's conversational assistant subsystem with small, accurate changes that fit the existing Electron + TypeScript codebase.

<operating_rules>
- Keep changes surgical.
- Match the existing service, IPC, preload, and renderer patterns.
- Do not introduce new abstractions unless the assistant flow truly needs them.
- Do not add speculative features.
- Do not bypass the existing settings store, assistant service, or IPC channels.
- Always await assistant responses before updating UI state with assistant output.
- Preserve persisted memory and session behavior unless explicitly asked to change it.
</operating_rules>

<assistant_contract>
The assistant must:

- initialize from the main process service container
- use `AssistantService` as the facade
- use `DEFAULT_ASSISTANT_ID` for the default assistant
- create each `Assistant` lazily through the registry
- initialize memory and session state before answering
- read provider, API key, and model from app settings
- build the system prompt from assistant memory
- run the OpenAI chat completion loop through `runAgent`
- persist new conversation messages after each response
- return the final assistant text to the caller
- broadcast completed responses to renderer windows
</assistant_contract>

<dependencies>
Use the existing package dependencies:

- `electron`
- `electron-vite`
- `openai`
- `react`
- `react-dom`

Use the existing local dependencies:

- `StoreService` for assistant provider, API key, and model settings
- `CronService` for cron-related assistant tools
- `MemoryManager` for assistant workspace files and seeded templates
- `SessionManager` for persisted conversation history
- `runAgent` for the model/tool loop
- `defaultTools` for assistant tools
</dependencies>

<initialization>
Initialize the assistant in the main process during bootstrap.

Required shape:

```ts
const assistant = container.register(
	'assistant',
	new AssistantService(
		{ store: storeService, cron: cronService },
		{ defaultAssistantId: DEFAULT_ASSISTANT_ID }
	)
);
```

When implementing initialization:

1. Register `AssistantService` in `src/main/bootstrap.ts`.
2. Pass `storeService` and `cronService`.
3. Use `DEFAULT_ASSISTANT_ID`.
4. Register assistant IPC so renderers can invoke the assistant.
5. Let `AssistantService` eagerly create the default assistant.
6. Let each `Assistant` initialize lazily on first `send`.

`Assistant.init()` must:

- create the assistant workspace under Electron `userData`
- seed missing memory templates
- initialize the session file
- load previous session messages
- protect against duplicate concurrent initialization
</initialization>

<configuration>
Before sending a message, require:

- selected assistant provider
- configured provider API key
- selected assistant model

Read configuration through:

- `StoreService.getAssistantService()`
- `StoreService.getProviderById(providerId)`

If configuration is incomplete, fail with a clear error:

- assistant provider not configured
- provider record not found
- provider API key missing
- assistant model missing
</configuration>

<run_app>
Install dependencies when needed:

```bash
yarn install
```

Run the app in development:

```bash
yarn dev
```

Before testing assistant messages in the UI:

1. Open Settings.
2. Select the assistant provider.
3. Add the provider API key.
4. Select the assistant model.
</run_app>

<send_message>
From renderer code, send messages through the preload API and await the promise:

```ts
const response = await window.app.assistant.send('Hello');
```

Use this wrapper shape when the renderer needs a local service:

```ts
export interface AssistantReply {
	readonly content: string;
}

export async function sendMessage(prompt: string): Promise<AssistantReply> {
	const content = await window.app.assistant.send(prompt);
	return { content };
}
```

Use this UI state sequence:

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
</send_message>

<ipc_contract>
Use only the existing assistant channels:

- `assistant:send`
- `assistant:reset`
- `assistant:response`

`assistant:send`:

- invoke with `(message: string, assistantId?: string)`
- return the assistant response text as `string`
- broadcast `assistant:response` after the response lands

`assistant:reset`:

- invoke with `(assistantId?: string)`
- clear the selected assistant conversation state
- return `void`

`assistant:response` event payload:

```ts
{
	assistantId: string;
	userMessage: string;
	response: string;
}
```
</ipc_contract>

<message_flow>
When a message is sent:

1. Renderer calls and awaits `window.app.assistant.send(message)`.
2. Preload invokes `assistant:send`.
3. `AssistantIpc` resolves `AssistantService`.
4. `AssistantService.send()` resolves the target assistant.
5. `Assistant.send()` initializes memory and session if needed.
6. The assistant builds the system prompt from memory.
7. The assistant reads API key and model from settings.
8. `runAgent` sends the request to OpenAI and runs tool calls if needed.
9. The assistant appends new messages to the session.
10. The assistant returns final text.
11. `AssistantIpc` broadcasts `assistant:response`.
12. Renderer updates assistant UI state after the awaited call resolves.
</message_flow>

<reset_flow>
When reset is requested:

1. Renderer awaits `window.app.assistant.reset()`.
2. Main process clears persisted session history.
3. Main process clears assistant memory workspace.
4. Main process clears in-memory history.
5. Main process reinitializes seeded templates.
</reset_flow>

<verification>
After assistant changes, run:

```bash
yarn typecheck
```

Manual verification:

1. Start the app with `yarn dev`.
2. Configure provider, API key, and model in Settings.
3. Send a message from the Assistant page.
4. Confirm the UI remains pending while the request is in flight.
5. Confirm the assistant reply appears after the promise resolves.
6. Restart the app and confirm prior session history is loaded.
</verification>
