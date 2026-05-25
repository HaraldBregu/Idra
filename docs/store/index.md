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
| `modelProviders` | Chat and model provider records, credentials, base URLs, catalog metadata, and enabled state. |
| `llmAgent` | Active chat model selection and agent-facing model options. |
| `speechToText` | Active speech-to-text provider, model, and module options. |
| `textToSpeech` | Active text-to-speech provider, model, and module options. |
| `imageCreator` | Active image creation provider, model, and module options. |
| `textToVideo` | Active video creation provider, model, and module options. |
| `textToSound` | Active sound generation provider, model, and module options. |
| `taskScheduler` | Scheduler configuration and persisted schedule records. |
| `heartbeat` | Heartbeat interval, prompts, delivery settings, agent settings, and lightweight run state. |
| `connectors` | Connector definitions, account settings, enabled state, and connector-specific secrets. |
| `channels` | Channel account settings, security policy, enabled state, and channel-specific secrets. |
| `policy` | Access control policy version, default decision, and path grants. |

## Normalization

Reads are tolerant. Missing roots are filled with defaults, legacy values are compacted into the current shape, and invalid module settings are dropped instead of leaking into runtime services.

Provider ids are normalized to lower-case where appropriate. String fields are trimmed. Module settings store only the active provider id, model id, reasoning effort, and module options needed by the runtime.

## Secrets

Provider API keys, connector secrets, and channel secrets remain in their owning roots. Public provider reads redact API keys. Tasks, schedules, heartbeat, and channel dispatch records reference provider configuration indirectly and do not copy provider secrets.

## Runtime Relationship

The store is configuration state, not the live execution engine. Background task records are kept in memory while they run. Managed schedule records are persisted under scheduler state and create background tasks when due. Channel, connector, heartbeat, and provider services read from the store at startup and when configuration changes.
