# Providers

Providers adapt configured model services into Friday's runtime interfaces. The current main-process runtime covers chat completion providers for the agent and speech-to-text providers for transcription.

## Chat Providers

| Provider | Functionality | How It Works |
| --- | --- | --- |
| Anthropic | Runs agent turns through Anthropic Messages streaming. | The adapter streams text, reasoning, and native tool-use blocks while normalizing auth and context-limit errors. |
| OpenAI | Runs agent turns through the OpenAI Responses API. | The adapter handles response items, reasoning output, function tool calls, usage, and streaming completion state. |
| Mistral | Runs agent turns through Mistral chat streaming. | The adapter maps Friday tools to Mistral function tools and normalizes streamed text, tool calls, reasoning settings, and errors. |
| DeepSeek | Runs agent turns through DeepSeek's OpenAI-compatible chat API. | The adapter uses DeepSeek defaults when no base URL is supplied and preserves reasoning content when the model returns it. |
| Qwen | Runs agent turns through Qwen's OpenAI-compatible chat API. | The adapter uses the configured base URL or the Qwen-compatible default endpoint and streams chat deltas through the common adapter shape. |
| OpenAI-compatible fallback | Supports additional compatible providers. | Unknown provider ids are treated as OpenAI-compatible chat providers when they have usable endpoint and credential settings. |

## Agent Provider Flow

1. The store resolves the active provider id, model id, API key, base URL, reasoning effort, and provider options.
2. The agent service asks the provider module to create a streaming adapter.
3. The agent loop sends messages and tool definitions through that adapter.
4. Provider events are normalized into text deltas, reasoning deltas, tool calls, usage, completion, or error events.
5. The agent persists the resulting transcript and handles auth or context-limit errors in a provider-neutral way.

## Speech-To-Text Providers

| Provider | Functionality | How It Works |
| --- | --- | --- |
| OpenAI | Realtime transcription. | Supported OpenAI transcription models run through a realtime WebSocket session. |
| ElevenLabs | Offline and realtime transcription. | Scribe models use upload-style transcription or realtime sessions depending on the selected model. |
| Mistral | Offline and realtime transcription. | Voxtral models use batch or realtime transcription depending on the selected model. |
| xAI | Batch and streaming transcription. | The adapter selects batch or streaming behavior from the configured xAI model. |
| Qwen | Realtime transcription. | Qwen realtime transcription models run through a realtime session adapter. |

## Settings And Credentials

Provider records live in settings and hold credentials, base URLs, model catalogs, and display metadata. Public provider reads redact API keys. Agent, task, schedule, heartbeat, and channel records reference provider configuration indirectly instead of copying provider secrets.

The store also contains module selections for speech-to-text, text-to-speech, image creation, video creation, and sound generation. In the current main process, chat providers and speech-to-text providers are the runtime-backed provider paths.
