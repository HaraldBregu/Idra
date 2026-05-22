# Store

Friday persists user settings in the Electron store named `settings`.
`StoreService` creates that store with `accessPropertiesByDotNotation: false`,
so every root key is addressed as a literal top-level key.

The source of truth for this document is:

- `src/main/store/types.ts` for persisted schema names.
- `src/main/store/service.ts` for normalization, defaults, and read/write
  behavior.
- Module docs under `docs/models`, `docs/tasks`, `docs/channels`, and
  `docs/connectors` for each root owner's behavior.

## Design Rules

- Use one root property per settings owner.
- Keep provider choices compact: `providerId`, `modelId`, optional `effort`,
  and safe `options`.
- Keep model provider credentials in `modelProviders`.
- Keep channel credentials under `channel` account records.
- Keep connector credentials in connector-owned records or credential
  references.
- Keep task records out of persistent settings.
- Keep schedule payloads free of credentials, provider records, channel tokens,
  and connector secrets.
- Store static labels, docs paths, and runtime status in code constants, not in
  user settings.

## Root Schema

Target persisted shape:

```ts
interface SettingsStore {
	modelProviders: ModelProviderSettings[];
	llmAgent?: ModelModuleSettings;
	speechToText?: ModelModuleSettings;
	textToSpeech?: ModelModuleSettings;
	imageCreator?: ModelModuleSettings;
	textToVideo?: ModelModuleSettings;
	textToSound?: ModelModuleSettings;
	ocr?: OcrModuleSettings;
	embedding?: EmbeddingModuleSettings;
	taskScheduler?: TaskSchedulerSettings;
	backgroundTask?: BackgroundTaskSettings;
	heartbeat?: HeartbeatStoreState;
	connectors?: ConnectorConfig[];
	channel?: Channel;
	appSettings?: AppSettings;
	appPermissions?: AppPermissionSettings;
}
```

Most keys are optional because older installs and fresh stores may not have
written them yet. Readers must tolerate missing keys and apply module defaults.
Root property names use camelCase. Product ids, provider ids, task types, and
docs filenames may use kebab-case, but persisted settings keys should not.

## Root Ownership

| Root key         | Owner             | Documentation                                                | Persisted data                                                         |
| ---------------- | ----------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `modelProviders` | Provider settings | [providers/index.md](../providers/index.md)                  | Provider ids, names, base URLs, and API keys for model-backed modules. |
| `llmAgent`       | LLM agent         | [large-language-model.md](../models/large-language-model.md) | Main assistant provider, model, effort, and safe agent options.        |
| `speechToText`   | Speech to text    | [speech-to-text.md](../models/speech-to-text.md)             | Live dictation and transcription provider/model settings.              |
| `textToSpeech`   | Text to speech    | [text-to-speech.md](../models/text-to-speech.md)             | Voice synthesis provider/model settings.                               |
| `imageCreator`   | Text to image     | [text-to-image.md](../models/text-to-image.md)               | Image generation/editing provider/model settings.                      |
| `textToVideo`    | Text to video     | [text-to-video.md](../models/text-to-video.md)               | Video generation provider/model settings.                              |
| `textToSound`    | Text to sound     | [music-creator.md](../models/music-creator.md)               | Sound, audio, and music generation provider/model settings.            |
| `ocr`            | OCR               | [ocr.md](../models/ocr.md)                                   | OCR endpoint settings or OCR provider/model settings.                  |
| `embedding`      | Embedding         | [embedding.md](../models/embedding.md)                       | Embedding provider/model and index settings.                           |
| `taskScheduler`  | Task scheduler    | [scheduled.md](../tasks/scheduled.md)                        | Managed schedule state, Friday cron state, and legacy cron task state. |
| `backgroundTask` | Background task   | [background.md](../tasks/background.md)                      | Task policy settings only; task records stay in memory.                |
| `heartbeat`      | Heartbeat         | [tasks/scheduled.md](../tasks/scheduled.md)                  | Heartbeat run state and last delivered heartbeat text by key.          |
| `connectors`     | Connectors        | [connectors/index.md](../connectors/index.md)                | Connector configuration records and credential references.             |
| `channel`        | Channels          | [channels/index.md](../channels/index.md)                    | Channel defaults, account settings, tokens, routing, and allowlists.   |
| `appSettings`    | App settings      | [settings-page.md](../ui/settings-page.md)                   | App-level non-permission settings such as keep-awake.                  |
| `appPermissions` | App permissions   | [settings-page.md](../ui/settings-page.md)                   | User toggles for app-level microphone and camera enablement.           |

Do not add new cross-module bags such as `service`, `agent`, or `settings`.
Add a new root key only when a module owns that data.

## Model Provider Records

Model provider credentials live in `modelProviders`. This root contains the
private provider records used by runtime adapters.

```ts
interface ModelProviderSettings {
	id: string;
	name: string;
	baseUrl: string;
	apiKey: string;
}
```

`StoreService` normalizes provider ids to lowercase and trims provider fields
before writing them. Read APIs that expose configured providers return the
provider without `apiKey`.

Module settings reference model providers by id. They do not duplicate API keys
or raw provider records in task, schedule, channel, connector, or tool payloads.

## Model Module Settings

Model-backed modules use this compact selection shape:

```ts
interface ModelModuleSettings {
	providerId: string;
	modelId: string;
	effort?: 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh';
	options?: Record<string, unknown>;
}
```

The module resolves the full model provider record from `modelProviders` when
work starts. Module-specific runtime options belong in `options` only when they
are safe to store and are not credentials.

Read normalization drops invalid module settings. A module setting is valid only
when it has a non-empty `providerId` and `modelId`. `providerId` is trimmed and
lowercased; `modelId` is trimmed; `effort` is kept only when it is a supported
model reasoning effort.

## OCR Settings

OCR can start endpoint-backed and later become provider-backed without changing
its root key.

```ts
type OcrModuleSettings =
	| {
			mode: 'endpoint';
			endpoint: string;
	  }
	| ({
			mode: 'model';
	  } & ModelModuleSettings);
```

## Embedding Settings

```ts
interface EmbeddingModuleSettings extends ModelModuleSettings {
	index?: {
		backend: 'local' | 'external';
		namespace?: string;
	};
}
```

Embedding credentials still belong in `modelProviders` or connector-specific
secret storage, not inside `embedding`.

## Task Scheduler Settings

```ts
interface TaskSchedulerSettings {
	enabled?: boolean;
	managed?: unknown;
	friday?: unknown;
	legacyTasks?: unknown[];
}
```

The task scheduler owns timing and schedule state. Scheduled payloads store only
task type and sanitized task input. Provider/model settings are resolved by the
module that performs the work.

`StoreService` stores all scheduler variants under one root:

- `managed`: managed schedule state from `CronSchedulerService`.
- `friday`: Friday cron job, state, and run history.
- `legacyTasks`: legacy `node-cron` task records.

Writers should patch this root rather than replacing unrelated scheduler state.

## Background Task Settings

```ts
interface BackgroundTaskSettings {
	allowedTaskTypes?: string[];
	defaultConcurrency?: number;
}
```

Task records remain in memory for the current app session. They are not
persisted in the settings store. `StoreService` normalizes `allowedTaskTypes`
to non-empty strings and keeps `defaultConcurrency` only when it is a positive
integer.

## Heartbeat State

```ts
interface HeartbeatStoreState {
	version: 1;
	taskState: Record<string, { lastRunMs: number }>;
	lastDelivered: Record<string, { text: string; atMs: number }>;
}
```

Heartbeat configuration for agents is stored in `llmAgent.options.agents`.
The `heartbeat` root stores runtime state only. `StoreService` migrates invalid
or missing heartbeat state to an empty version `1` state.

## Channel Settings

The `channel` root stores all channel provider settings. `StoreService`
hydrates defaults for every `CHANNEL_PROVIDER_IDS` entry, including Telegram,
WhatsApp, Discord, Slack, and the generic channel providers.

Channel records may include tokens, webhook URLs, client secrets, account
allowlists, default targets, and heartbeat visibility settings. Those values
belong to the channel owner. They must not be copied into task input, schedule
payloads, model module options, or tool payloads.

## App Settings And Permissions

```ts
interface AppSettings {
	keepAwakeEnabled: boolean;
}

interface AppPermissionSettings {
	microphoneEnabled: boolean;
	cameraEnabled: boolean;
}
```

App settings and app permission toggles are separate roots. Current defaults
are:

- `appSettings.keepAwakeEnabled`: `false`.
- `appPermissions.microphoneEnabled`: `true`.
- `appPermissions.cameraEnabled`: `true`.

These settings are app-level preferences. System permission status is reported
through platform APIs and should not be persisted in these roots.

## Migration And Compatibility Rules

- Prefer tolerant readers and narrow writers. Normalize known shapes when
  reading, and avoid deleting unknown module-owned fields unless that module
  owns the migration.
- Keep legacy read helpers local to `StoreService`. Do not make new writes to
  retired roots such as `service`, `agent`, `rag`, or standalone `sound`.
- When adding a root key, update `src/main/store/types.ts`, `StoreService`,
  tests, this document, and the owning module doc in the same change.
- When moving a value between roots, provide a migration or a read fallback
  before removing the old path.
