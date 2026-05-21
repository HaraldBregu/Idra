# Store

Friday persists user settings in the Electron store named `settings`. Store
settings are organized by root-level properties. Each major module owns one
root property; modules do not share one nested settings object.

## Root Structure

Target shape:

```ts
interface SettingsStore {
	modelProviders: ModelProviderSettings[];
	llmAgent?: ModelModuleSettings;
	speechToText?: ModelModuleSettings;
	textToSpeech?: ModelModuleSettings;
	imageCreator?: ModelModuleSettings;
	textToVideo?: ModelModuleSettings;
	textToSound?: ModelModuleSettings;
	taskScheduler?: TaskSchedulerSettings;
	backgroundTask?: BackgroundTaskSettings;
	heartbeat?: HeartbeatStoreState;
	connectors?: ConnectorConfig[];
	channel?: Channel;
}
```

Root property names use camelCase. Product ids, task types, and docs filenames
may use kebab-case, but persisted settings keys should not.

## Model Provider Records

Model provider credentials live only in `modelProviders`.

```ts
interface ModelProviderSettings {
	id: string;
	name: string;
	baseUrl: string;
	apiKey: string;
}
```

Module settings reference model providers by id. They do not duplicate API keys,
base URLs, webhook secrets, refresh tokens, or raw provider records in task,
schedule, channel, or tool payloads.

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

## Module Keys

| Root key | Module | Documentation | Notes |
| --- | --- | --- | --- |
| `llmAgent` | LLM agent | [large-language-model.md](models/large-language-model.md) | Main assistant provider, model, and effort. |
| `speechToText` | Speech to text | [speech-to-text.md](models/speech-to-text.md) | Live dictation and transcription model settings. |
| `textToSpeech` | Text to speech | [text-to-speech.md](models/text-to-speech.md) | Voice synthesis model settings. |
| `imageCreator` | Text to image | [text-to-image.md](models/text-to-image.md) | Text-to-image generation/editing model settings. |
| `textToVideo` | Text to video | [text-to-video.md](models/text-to-video.md) | Video generation model settings. |
| `textToSound` | Text to sound | [music-creator.md](models/music-creator.md) | Sound, audio, and music generation model settings. |
| `ocr` | OCR | [ocr.md](models/ocr.md) | OCR endpoint or provider/model settings. |
| `embedding` | Embedding | [embedding.md](models/embedding.md) | Embedding provider/model and index settings. |
| `taskScheduler` | Task scheduler | [task-scheduler.md](task-scheduler.md) | Managed schedules, Friday tool schedules, and legacy schedule state. |
| `backgroundTask` | Background task | [background-task.md](background-task.md) | Task registry and allowed user-facing task settings. |

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

## Background Task Settings

```ts
interface BackgroundTaskSettings {
	allowedTaskTypes?: string[];
	defaultConcurrency?: number;
}
```

Task records remain in memory for the current app session. They are not
persisted in the settings store.

## Naming Rules

- Use one root property per module.
- Store model choices as `providerId` and `modelId`.
- Keep credentials in `modelProviders`.
- Keep task records out of persistent settings.
- Keep schedule payloads free of credentials and provider records.
- Store static labels, docs paths, and runtime status in code constants, not in
  user settings.
