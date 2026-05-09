# Assistant

The assistant is Friday's main-process conversational assistant. Think of it like a front desk with a notebook: each request comes in, the assistant checks its markdown memory, calls tools when needed, writes the conversation back to disk, and returns the final reply.

Source: `src/main/assistant/`.

## Main Pieces

- `service.ts` owns the public `AssistantService` facade and exposes `send(message)`.
- `assistant.ts` is the internal assistant engine and resolves API key/model settings from `StoreService`.
- `registry.ts` stores constructed assistants by id for internal reuse.
- `memory.ts` manages per-assistant markdown memory under `userData/assistant/workspaces/<id>/`.
- `session.ts` persists JSONL chat history and sanitizes invalid tool-call history before reuse.
- `loop.ts` runs the ReAct-style Chat Completions loop.
- `tools/` contains the built-in file, shell, cron, provider, and channel tools.

## Flow

```text
Renderer / channel
       |
       v
AssistantIpc or ChannelRegistry
       |
       v
AssistantService.send(message)
       |
       v
Assistant
       |
       +--> MemoryManager -> markdown prompt sections
       +--> SessionManager -> last 50 sanitized messages
       +--> StoreService    -> OpenAI key + selected model
       +--> defaultTools    -> files, shell, providers, channels, cron
       |
       v
runAgent() -> OpenAI Chat Completions -> tool calls -> final text
       |
       v
SessionManager.append(newMessages)
```

## Lifecycle

The assistant facade is registered during bootstrap in `src/main/bootstrap.ts`.

```ts
const assistant = container.register(
	'assistant',
	new AssistantService(
		{ store: storeService, cron: cronService },
		{ defaultAssistantId: DEFAULT_ASSISTANT_ID }
	)
);
```

`AssistantService.send()` initializes the underlying assistant lazily on first use:

1. Seeds the markdown memory workspace from `src/main/assistant/templates/*.md`.
2. Loads persisted session messages.
3. Builds the system prompt from the memory files.
4. Resolves the OpenAI API key and selected model from `StoreService`.
5. Runs the model/tool loop with the configured tools.
6. Appends only the new messages to session history.

`AssistantService.reset()` clears the session and memory workspace, then reinitializes the assistant.

## Settings Resolution

The assistant does not accept dynamic model or API key callbacks anymore. It receives `StoreService` in the constructor and resolves settings internally.

API key lookup order:

1. `store.getAssistantService().llm`
2. `store.resolveProviderRef(ref)?.provider.apiKey`
3. `store.findProvider('openai')?.apiKey`

Model lookup order:

1. Explicit model on `store.getAssistantService().llm`
2. Resolved model from `store.resolveProviderRef(ref)`
3. Default model from the OpenAI provider entry

If no API key is available, `AssistantService.send()` throws `OpenAI API key not configured. Add an OpenAI provider in Settings.` If no model is available, it throws `Assistant model not configured. Select a model in Settings.`

## Calling It

The main IPC contract lives in `src/shared/channels.ts`:

```ts
AssistantChannels.send; // "assistant:send"
AssistantChannels.reset; // "assistant:reset"
AssistantChannels.response; // "assistant:response"
```

`AssistantIpc` calls the assistant facade and broadcasts the response to all windows:

```ts
registerCommand(AssistantChannels.send, async (message: string, assistantId?: string) => {
	const id = assistantId ?? DEFAULT_ASSISTANT_ID;
	const response = await assistant.send(message, id);

	const event: AssistantResponseEvent = { assistantId: id, userMessage: message, response };
	for (const win of BrowserWindow.getAllWindows()) {
		win.webContents.send(AssistantChannels.response, event);
	}
	return response;
});
```

Channel adapters use the same facade path. An inbound Telegram, Discord, or WhatsApp message is sent to the default assistant and the reply is sent back through the same channel. Channel replies are also rendered through `marked` for terminal logging.

Task handlers can resolve `assistant` from the service container and call `assistant.send(input)`.

For tests or scripts, construct the facade directly with `StoreService` and `CronService`:

```ts
const assistant = new AssistantService({ store: storeService, cron: cronService });
const reply = await assistant.send('hello');
```

## Configuration

The `AssistantService` constructor takes its dependencies as the first argument.

The constructor also requires:

- `StoreService`: provider, model, assistant, and channel settings.
- `CronService`: cron scheduling backend for cron tools.

The session key is always `assistant:<id>`. The model/tool loop is capped at `20` iterations.

## Tools

`defaultTools()` currently requires both `cron` and `store`, and returns the full tool set every time:

- Files: `read_file`, `write_file`
- Shell: `exec`
- OpenAI settings: `set_openai_api_key`, `set_openai_model`
- Anthropic settings: `set_anthropic_api_key`, `set_anthropic_model`
- Channels: `get_channels`, `get_telegram_channel`, `set_telegram_token`, `set_telegram_allow_from`, `get_whatsapp_channel`, `set_whatsapp_phone_number`, `set_whatsapp_token`, `get_discord_channel`, `set_discord_token`, `set_discord_allow_from`
- Cron: `cron_add`, `cron_list`, `cron_remove`

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

## Session History

Session history lives in:

```text
userData/assistant/sessions/<sessionKey>.jsonl
```

On first init, `SessionManager` creates the file and writes a metadata line with the session key and creation timestamp. Message lines are appended as JSON with a `timestamp`.

`load()` reads the last `50` messages, removes timestamps, and sanitizes tool-call pairs. This matters because OpenAI rejects orphan `role: "tool"` messages and assistant messages that contain unresolved `tool_calls`.

## Gotchas

- `src/main/assistant/index.ts` only exports the public facade and default id. Internal modules should be imported by relative path from inside `src/main/assistant`.
- The settings page service currently calls `window.app.assistant.*`; the shared IPC channels and main handler exist, but the preload `AppApi` must expose that namespace for the renderer path to work.
- `exec` defaults to the OS home directory unless constructed with a workspace. The assistant prompt still tells the model to use absolute paths rooted at the markdown memory workspace.
