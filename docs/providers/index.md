# Providers

The providers module adapts configured model providers to Friday's runtime
contracts. In the current main process, provider runtime support is implemented
for chat-style agent runs and speech-to-text transcription sessions.

## Chat Provider Runtime

Agent runs do not call vendor SDKs directly. The agent resolves the configured
provider and model from the store, creates a provider adapter, and then consumes
a common stream of model events.

The common stream includes message start and end events, text deltas, reasoning
items, tool-call start and argument deltas, tool-call end events, stop reasons,
and token usage. The agent loop uses this stream to append transcript entries,
execute tools, handle context overflow, and save the session.

| Provider id | Runtime behavior |
| --- | --- |
| `anthropic` | Uses Anthropic Messages streaming and maps Anthropic tool use and tool result blocks into Friday's transcript model. |
| `openai` | Uses the OpenAI Responses streaming API and preserves OpenAI reasoning items when present. |
| `deepseek` | Uses an OpenAI-compatible chat adapter with DeepSeek defaults, reasoning effort support, reasoning content preservation, and thinking mode. |
| `mistral` | Uses Mistral chat streaming, including tool calls and supported reasoning effort mapping. |
| `qwen` | Uses an OpenAI-compatible chat adapter with Qwen's default compatible endpoint. |
| other provider ids | Use the OpenAI-compatible Chat Completions adapter with the configured base URL. |

Authentication and base URLs come from stored provider records. Missing or
invalid API keys become provider authentication errors. Context-limit failures
are normalized so the agent can compact once and retry when supported.

## Speech-To-Text Runtime

Realtime transcription resolves the configured speech-to-text provider and
model, finds a matching adapter, starts a session for the requesting renderer,
streams events back to that renderer, and accepts audio chunks until finish or
cancel.

| Provider id | Supported behavior |
| --- | --- |
| `openai` | Realtime transcription sessions for the supported OpenAI transcription models. |
| `elevenlabs` | Offline Scribe transcription and realtime Scribe transcription depending on the selected model. |
| `mistral` | Offline Voxtral transcription and realtime Voxtral transcription depending on the selected model. |
| `xai` | Batch and streaming speech-to-text depending on the selected model. |
| `qwen` | Realtime Qwen transcription sessions for supported realtime speech models. |

Sessions are owned by the renderer that starts them. Audio append, finish, and
cancel operations are accepted only from that owner. Sessions close when the
provider completes, the user cancels, or the owning renderer is destroyed.

## Model-Backed Settings

The store can hold model selections for the assistant, speech-to-text,
text-to-speech, image generation, video generation, and music/audio generation.
The current main-process runtime described here executes assistant chat and
speech-to-text sessions. Other selections are persisted for settings and future
module runtimes but are not all backed by main-process execution adapters.

Provider records are private. Public settings views receive provider metadata
without API keys. Task, schedule, heartbeat, channel, and connector payloads
refer to provider/model choices indirectly and resolve the current settings at
run time.

## Error Handling

Provider adapters normalize common failure classes:

- Missing credentials become authentication errors.
- Context and token-limit failures become context-overflow errors.
- Abort signals stop the active stream or transcription session.
- Vendor-specific tool-call and response shapes are converted before they enter
  the agent transcript.
