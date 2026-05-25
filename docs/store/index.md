# Store

The store persists Friday's application settings. It is an Electron settings store named `settings` with dot notation disabled, so each top-level root is owned and updated as a structured object.

## Functionality

- Persists provider records and module model selections.
- Stores connector configuration and channel accounts.
- Stores scheduler and heartbeat configuration.
- Normalizes missing or legacy settings during reads.
- Redacts provider secrets from public reads.
- Keeps writes scoped to the owning root.

Keep-awake state currently has a store-facing API but is kept in memory rather than persisted.

## Root Ownership

| Root | Owns |
| --- | --- |
| [`modelProviders`](providers.md) | Chat and model provider records, credentials, base URLs, catalog metadata, and enabled state. |
| [`llmAgent`](assistant.md) | Active chat model selection and agent-facing model options. |
| [`speechToText`](speech-to-text.md) | Active speech-to-text provider, model, and module options. |
| [`textToSpeech`](text-to-speech.md) | Active text-to-speech provider, model, and module options. |
| [`imageCreator`](image-creator.md) | Active image creation provider, model, and module options. |
| [`textToVideo`](text-to-video.md) | Active video creation provider, model, and module options. |
| [`textToSound`](text-to-sound.md) | Active sound generation provider, model, and module options. |
| [`taskScheduler`](task-scheduler.md) | Scheduler configuration and persisted schedule records. |
| [`backgroundTask`](background-task.md) | Background task admission and concurrency settings. |
| [`agents`](agents.md) | Agent definitions, route bindings, workspaces, tool policy, and subagent settings. |
| [`heartbeat`](heartbeat.md) | Lightweight heartbeat run state and delivered text records. |
| [`connectors`](connectors.md) | Connector definitions, account settings, enabled state, and connector-specific secrets. |
| [`channels`](channels.md) | Channel account settings, security policy, enabled state, and channel-specific secrets. |
| [`policy`](policy.md) | Access control policy version, default decision, and path grants. |

## Normalization

Reads are tolerant. Missing roots are filled with defaults, legacy values are compacted into the current shape, and invalid module settings are dropped instead of leaking into runtime services.

Provider ids are normalized to lower-case where appropriate. String fields are trimmed. Module settings store only the active provider id, model id, reasoning effort, and module options needed by the runtime.

## Secrets

Provider API keys, connector secrets, and channel secrets remain in their owning roots. Public provider reads redact API keys. Tasks, schedules, heartbeat, and channel dispatch records reference provider configuration indirectly and do not copy provider secrets.

## Runtime Relationship

The store is configuration state, not the live execution engine. Background task records are kept in memory while they run. Managed schedule records are persisted under scheduler state and create background tasks when due. Channel, connector, heartbeat, and provider services read from the store at startup and when configuration changes.

## Related Docs

- [Providers](providers.md)
- [Assistant](assistant.md)
- [Speech To Text](speech-to-text.md)
- [Text To Speech](text-to-speech.md)
- [Image Creator](image-creator.md)
- [Text To Video](text-to-video.md)
- [Text To Sound](text-to-sound.md)
- [Task Scheduler](task-scheduler.md)
- [Background Task](background-task.md)
- [Agents](agents.md)
- [Heartbeat](heartbeat.md)
- [Connectors](connectors.md)
- [Channels](channels.md)
- [Policy](policy.md)
