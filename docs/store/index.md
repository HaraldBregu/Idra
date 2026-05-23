# Store

The store module persists Friday settings in the Electron settings store. It is
the shared source for provider credentials, model selections, scheduler state,
heartbeat state, connector configuration, channel configuration, and a small
set of app settings.

## Functionality

The store gives each module one owned root key. Reads tolerate missing or older
values and return normalized defaults. Writes update only the root owned by the
calling module so unrelated settings survive.

Provider credentials are private. Public provider reads omit API keys. Channel
and connector credential fields stay inside their module-owned records and
should not be copied into task, schedule, heartbeat, model option, or tool
payloads.

The keep-awake setting is currently held in memory and restored through the app
bootstrap path when enabled. It is exposed through the same settings-facing IPC
surface as other app preferences but does not live in the persistent store root
schema.

## Root Ownership

| Root key | Owner | Stored data |
| --- | --- | --- |
| `modelProviders` | Provider settings | Provider ids, display names, base URLs, and API keys used by model-backed modules. |
| `llmAgent` | Assistant agent | Assistant provider id, model id, reasoning effort, safe options, agent runtime preference, and heartbeat agent options. |
| `speechToText` | Speech-to-text | Transcription provider and model selection. |
| `textToSpeech` | Text-to-speech | Voice synthesis provider and model selection. |
| `imageCreator` | Image generation | Image provider and model selection. |
| `textToVideo` | Video generation | Video provider and model selection. |
| `textToSound` | Music/audio generation | Music or sound provider and model selection. |
| `taskScheduler` | Scheduling | Managed schedule state, Friday cron state, and legacy cron task records. |
| `backgroundTask` | Background tasks | Allowed task types and default concurrency policy. Task records themselves stay in memory. |
| `heartbeat` | Heartbeat | Runtime heartbeat state such as last run times and last delivered text. |
| `connectors` | Connectors | Connector records, authorization data, OAuth credentials, allowed tools, runtime flags, and status metadata. |
| `channels` | Channels | Channel defaults, account settings, tokens, routing, allowlists, and heartbeat visibility. |

Do not add broad cross-module roots such as `service`, `agent`, or `settings`.
New persistent data should be placed under the module that owns it.

## Provider Records

Provider records are normalized by trimming fields and lowercasing provider
ids. Adding a provider rejects duplicate ids. Upserting a provider replaces the
matching normalized id or appends a new provider.

Model-backed module settings store only provider id, model id, optional
reasoning effort, and safe options. The full provider record is resolved at run
time from `modelProviders`.

Agent, heartbeat, background task, and scheduled task execution should resolve
the current assistant provider and model through store-backed helpers when work
starts. They should not embed API keys, base URLs, or raw provider records in
their own payloads.

## Module Settings

Assistant, speech-to-text, text-to-speech, image, video, and music settings all
use a compact provider/model selection. Setter methods validate the selected
model against the relevant model catalog where the app has a catalog for that
capability.

Invalid or incomplete module settings are dropped on read. Unsupported
reasoning effort values are dropped unless the selected model/provider supports
them.

## Scheduler State

Scheduling keeps all scheduler variants under the `taskScheduler` root:

- `managed` stores managed schedule records, events, locks, executions, and
  next-run state.
- `friday` stores Friday cron jobs, state, and run history.
- `legacyTasks` stores older cron task records for compatibility.

Writers patch scheduler state narrowly. A managed schedule write should not
replace Friday cron state, and a Friday cron write should not replace managed
schedule state.

## Background Task Settings

Background task records are in-memory only. The persistent background task root
contains policy, including allowed task types and default concurrency.

Allowed task types are normalized to non-empty strings. Default concurrency is
kept only when it is a positive integer.

## Heartbeat State

Heartbeat configuration for agents lives in assistant options. The `heartbeat`
root stores runtime state only. Invalid heartbeat state is migrated to an empty
versioned state.

Heartbeat state must not duplicate provider ids, model ids, API keys, provider
records, channel tokens, or connector credentials.

## Connector And Channel Settings

Connector settings store connector records and OAuth state. Reads return
configured connector records for runtime use and redacted views for display.

Channel settings store defaults for every catalog id. Telegram has a
first-class config shape because it has a bundled runtime. Other channels use
generic account maps until they gain runtime adapters.

Token, secret, webhook, phone number, route, allowlist, and heartbeat visibility
fields belong to the channel owner. They should stay out of unrelated module
state.

## Compatibility Rules

- Readers should be tolerant and normalize known shapes.
- Writers should avoid deleting unknown module-owned fields.
- Retired roots may be read for compatibility but should not receive new writes.
- Moving a value between roots requires a fallback or migration before removing
  the old path.
- Secrets must remain in their owner records and must not be logged or copied
  into task, schedule, or agent-visible payloads.
