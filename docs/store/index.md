# Store

The store persists Friday's application settings. It is an Electron settings store named `settings` with dot notation disabled, so each top-level property is owned and updated as a structured object.

## Functionality

- Persists provider records and module model selections.
- Stores connector configuration and channel accounts.
- Stores scheduler configuration.
- Normalizes missing settings during reads.
- Redacts provider secrets from public reads.
- Keeps writes scoped to the owning property.

Keep-awake state currently has a store-facing API but is kept in memory rather than persisted.

## Properties

| Property | Type | Owns |
| --- | --- | --- |
| [`providers`](providers.md) | `ProvidersSettings` | Chat and model provider records, credentials, base URLs, catalog metadata, and enabled state. |
| [`assistant`](assistant.md) | `AssistantSettings` | Active chat model selection and agent-facing model options. |
| [`speechToText`](speech-to-text.md) | `SpeechToTextSettings` | Active speech-to-text provider, model, and module options. |
| [`textToSpeech`](text-to-speech.md) | `TextToSpeechSettings` | Active text-to-speech provider, model, and module options. |
| [`imageCreator`](image-creator.md) | `ImageCreatorSettings` | Active image creation provider, model, and module options. |
| [`textToVideo`](text-to-video.md) | `TextToVideoSettings` | Active video creation provider, model, and module options. |
| [`textToSound`](text-to-sound.md) | `TextToSoundSettings` | Active sound generation provider, model, and module options. |
| [`cron`](cron.md) | `CronSettings` | Scheduler configuration and persisted schedule records. |
| [`task`](task.md) | `TaskSettings` | Background task admission and concurrency settings. |
| [`agents`](agents.md) | `AgentsSettings` | Agent definitions, route bindings, workspaces, tool policy, and subagent settings. |
| [`connectors`](connectors.md) | `ConnectorConfig[]` | MCP connector definitions, enabled state, approval policy, env-var secret references, and discovered tools. |
| [`channels`](channels.md) | `ChannelsSettings` | Channel account settings, security policy, enabled state, and channel-specific secrets. |

## Normalization

Reads are tolerant. Missing properties are filled with defaults, and invalid module settings are dropped instead of leaking into runtime services.

Provider ids are normalized to lower-case where appropriate. String fields are trimmed. Module settings store only the active provider id, model id, reasoning effort, and module options needed by the runtime.

## Secrets

Provider API keys, connector secrets, and channel secrets remain in their owning properties. Public provider reads redact API keys. Tasks, schedules, and channel dispatch records reference provider configuration indirectly and do not copy provider secrets.

## Runtime Relationship

The settings store is configuration state, not the live execution engine. Background task records are persisted separately in `task.json` by the tasks service while live execution objects stay in memory. Managed schedule records are persisted under scheduler state and create background tasks when due. Heartbeat configuration and runtime bookkeeping are persisted separately in `heartbeat.json`.

## Related Docs

- [Providers](providers.md)
- [Assistant](assistant.md)
- [Speech To Text](speech-to-text.md)
- [Text To Speech](text-to-speech.md)
- [Image Creator](image-creator.md)
- [Text To Video](text-to-video.md)
- [Text To Sound](text-to-sound.md)
- [Cron](cron.md)
- [Task](task.md)
- [Agents](agents.md)
- [Heartbeat](heartbeat.md)
- [Connectors](connectors.md)
- [Channels](channels.md)
