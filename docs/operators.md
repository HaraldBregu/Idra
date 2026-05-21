# Operators

Operators are Friday services that perform user-visible work by using a
configured LLM provider, ML provider, model, endpoint, scheduler, or task
runtime. They are the product-level roles shown in Settings, not every internal
class.

Source of truth:

- `src/shared/service.ts`: shared operator settings shape, `Agent`, `Model`,
  reasoning effort, and operator model constants.
- `src/shared/providers.ts`: provider catalog, provider capabilities, official
  provider docs, and default assistant model catalogs.
- `src/main/store/service.ts`: persisted provider records and operator
  selections.
- `src/main/service.ts`: Friday assistant runtime and provider/model
  resolution.
- `src/main/ipc/app-ipc.ts`: provider and operator-selection IPC handlers.
- `src/main/ipc/realtime-transcription-ipc.ts`: speech-to-text runtime.
- `src/main/tasks`: in-memory background task manager and registered task
  handlers.
- `src/main/cron`: cron scheduler and Friday cron runtime.
- `src/renderer/src/pages/settings/pages/operators`: operator settings UI.

An operator must know which provider and model to use before it starts work.
That selection comes from Settings through `StoreService`. The documentation
name for this settings shape is `Operator`. The implementation may still use
the persisted key `service` for backwards compatibility; do not treat that
storage key as the product name.

Rules:

- Give every operator its own main-process module.
- Store provider credentials only on configured provider records under
  `providers`.
- Store operator provider/model choices on `operator` or another typed
  StoreService-backed state object.
- Resolve provider id, model id, API key, and base URL once at the start of the
  operation.
- Allow per-run provider/model overrides only as ids, not as credentials or
  provider records.
- Never accept API keys, base URLs, webhook secrets, or raw credentials from
  task input, cron payloads, channel payloads, or renderer runtime calls.
- Keep unsupported operators visible as Settings placeholders only until they
  have a StoreService slot and runtime.

The target `Operator` interface contains every product-level operator.
Operators that are not runtime-backed yet should still appear here so Settings,
docs, and future runtime work share stable names.

```ts
interface Operator {
	assistant?: ModelOperator;
	speechToText?: ModelOperator;
	textToSpeech?: ModelOperator;
	imageCreator?: ModelOperator;
	videoCreator?: ModelOperator;
	musicCreator?: ModelOperator;
	documentReaderOcr?: ModelOperator | EndpointOperator;
	cronTaskScheduler?: SchedulerOperator;
	backgroundTask?: TaskOperator;
}

interface ModelOperator {
	id: string;
	name: string;
	docsPath: string;
	provider?: Omit<Provider, 'apiKey'>;
	model?: Model;
	status: 'implemented' | 'placeholder' | 'pending-runtime';
}

interface EndpointOperator {
	id: string;
	name: string;
	docsPath: string;
	endpoint: string;
	status: 'implemented' | 'placeholder' | 'pending-runtime';
}

interface SchedulerOperator {
	id: string;
	name: string;
	docsPath: string;
	status: 'implemented' | 'placeholder' | 'pending-runtime';
}

interface TaskOperator {
	id: string;
	name: string;
	docsPath: string;
	registeredTaskTypes: string[];
	status: 'implemented' | 'placeholder' | 'pending-runtime';
}
```

`ModelOperator.provider` is a public provider record without `apiKey` plus a
selected model. The private API key and base URL are resolved later from the
matching provider record.

## Module Boundary

Each operator must have its own main-process module. IPC handlers, task
handlers, cron runners, renderer code, and provider adapters should call the
operator module instead of sharing provider/model logic across unrelated
operators.

Recommended module ownership:

| Operator field | Module owner | Responsibility |
| --- | --- | --- |
| `operator.assistant` | Assistant module | Assistant runs, provider/model resolution, tool loop |
| `operator.speechToText` | STT module | Audio transcription sessions and STT adapters |
| `operator.textToSpeech` | TTS module | Speech synthesis and TTS adapters |
| `operator.imageCreator` | Image module | Image generation/editing and image adapters |
| `operator.videoCreator` | Video module | Video generation jobs and video adapters |
| `operator.musicCreator` | Sound module | Sound/music generation and audio adapters |
| `operator.documentReaderOcr` | Document reader OCR module | OCR execution and OCR adapters |
| `operator.cronTaskScheduler` | Cron module | Scheduling, persistence, due-run processing |
| `operator.backgroundTask` | Task module | Immediate task lifecycle and task registry |

Every model-backed operator module should expose a small service API, read its
own `operator.*` selection from `StoreService`, resolve the configured provider
record from `StoreService`, and keep provider-specific behavior behind
adapters. Task and cron modules remain operator modules too, but they should
dispatch to other operator modules for provider-backed work instead of hosting
provider/model execution themselves.

## Assistant

- Stable id: `friday`
- Runtime id: `main`
- Operator field: `operator.assistant`
- Documentation: [agent.md](agent.md)
- Runtime status: implemented through `AgentService.send`

The Friday assistant stores its default provider and model on
`operator.assistant`. Provider credentials stay on the matching provider record
under `providers`.

The assistant should be owned by its own main-process assistant module.
Existing `AgentService` behavior belongs behind that module boundary.

Execution path:

1. `AgentService.send()` reads the saved assistant provider/model selection.
2. Optional send overrides can replace `providerId`, `model`, and `effort`.
3. `StoreService.getProviderById(providerId)` supplies API key and base URL.
4. `makeProvider()` creates the runtime adapter.
5. The selected model is passed into the provider-neutral assistant loop.

Renderer/provider IPC:

- `provider:get-agent-service`
- `provider:save-agent-service`

Background tasks and cron jobs can run the assistant through `agent.run` or
Friday cron `agentTurn` payloads. Those payloads may pass provider/model ids as
overrides, but credentials still resolve from stored provider records.

## Speech To Text

- Stable id: `speech-to-text`
- Operator field: `operator.speechToText`
- Documentation: [stt.md](stt.md)
- Runtime status: implemented through realtime transcription IPC

Speech-to-text stores its provider and model on `operator.speechToText`. The
runtime should be a separated main-process STT module. IPC handlers pass audio
and session commands to that module; they do not decide which provider or model
to use.

Provider/model rules:

- Provider is not limited to one vendor.
- Model is not limited to one STT model.
- The selected provider and model come from `operator.speechToText`.
- The STT module resolves API key, base URL, and provider configuration from
  the matching configured provider in `StoreService`.
- Provider-specific runtime details stay inside STT adapters.

Operator-selection IPC:

- `operator:get-speech-to-text`
- `operator:save-speech-to-text`
- `provider:get-speech-transcriber-service`
- `provider:save-speech-transcriber-service`

Runtime IPC:

- `realtime-transcription:start`
- `realtime-transcription:append-audio`
- `realtime-transcription:finish`
- `realtime-transcription:cancel`
- `realtime-transcription:event`

The realtime transcription IPC rejects startup when the speech-to-text operator
is not configured, the selected provider record is missing credentials, the
selected model does not support STT, or no adapter exists for the selected
provider/model pair.

## Text To Speech

- Stable id: `text-to-speech`
- Operator field: `operator.textToSpeech`
- Documentation: [text-to-speech.md](text-to-speech.md)
- Runtime status: pending runtime

Text-to-speech stores its provider and model on `operator.textToSpeech`. The
runtime should be a separated main-process TTS module. UI, task handlers, and
cron pass text and synthesis options to that module; they do not decide which
provider or model to use.

Provider/model rules:

- Provider is not limited to one vendor.
- Model is not limited to one TTS model.
- The selected provider and model come from `operator.textToSpeech`.
- The TTS module resolves API key, base URL, and provider configuration from
  the matching configured provider in `StoreService`.
- Provider-specific runtime details stay inside TTS adapters.
- Recommended task type: `text-to-speech.run`.

## Image Creator

- Stable id: `image-assistant`
- Operator field: `operator.imageCreator`
- Documentation: [image-creator.md](image-creator.md)
- Runtime status: pending runtime

Image creator stores its provider and model on `operator.imageCreator`. The
runtime should be a separated main-process image module. UI, task handlers, and
cron pass prompt and asset references to that module; they do not decide which
provider or model to use.

Provider/model rules:

- Provider is not limited to one vendor.
- Model is not limited to one image model.
- The selected provider and model come from `operator.imageCreator`.
- The image module resolves API key, base URL, and provider configuration from
  the matching configured provider in `StoreService`.
- Provider-specific runtime details stay inside image adapters.
- Recommended task type: `image.create`.

## Video Creator

- Stable id: `video-creator`
- Operator field: `operator.videoCreator`
- Documentation: [video-creator.md](video-creator.md)
- Runtime status: pending runtime

Video creator stores its provider and model on `operator.videoCreator`. The
runtime should be a separated main-process video module. UI, task handlers, and
cron pass prompt and asset references to that module; they do not decide which
provider or model to use.

Provider/model rules:

- Provider is not limited to one vendor.
- Model is not limited to one video model.
- The selected provider and model come from `operator.videoCreator`.
- The video module resolves API key, base URL, webhook secrets, and provider
  configuration from the matching configured provider in `StoreService`.
- Provider-specific runtime details stay inside video adapters.
- Recommended task type: `video.create`.

## Sound / Music Creator

- Stable id: `music-creator`
- Operator field: `operator.musicCreator`
- Documentation: [music-creator.md](music-creator.md)
- Runtime status: pending runtime

Sound and music creation stores its provider and model on
`operator.musicCreator`. The runtime should be a separated main-process sound
module. UI, task handlers, and cron pass prompt and audio options to that
module; they do not decide which provider or model to use.

Provider/model rules:

- Provider is not limited to one vendor.
- Model is not limited to one sound or music model.
- The selected provider and model come from `operator.musicCreator`.
- The sound module resolves API key, base URL, and provider configuration from
  the matching configured provider in `StoreService`.
- Provider-specific runtime details stay inside sound adapters.
- Recommended task type: `sound.create`.

## Document Reader OCR

- Stable id: `document-reader`
- Task type: `ocr.run`
- Operator field: `operator.documentReaderOcr`
- Documentation: `document-reader-ocr.md`
- Runtime status: OCR task implemented; provider/model picker pending

Document reader OCR should be owned by its own main-process OCR module. The
document reader settings row is a placeholder today, but OCR execution exists
as the `ocr.run` task handler.

Current OCR flow:

1. `TaskManager` starts a task of type `ocr.run`.
2. `OcrTaskHandler` validates `imageBase64`, optional `mimeType`, and optional
   `language`.
3. The handler reads the configured OCR endpoint.
4. The handler posts the OCR input as JSON to that endpoint.
5. The handler extracts text from a string response or from JSON keys `text`,
   `result`, or `output`.

This endpoint-based OCR path should be migrated to a provider/model StoreService
selection when the document reader runtime becomes provider-backed.

## Cron Task Scheduler

- Stable id: `cron-task-scheduler`
- Operator field: `operator.cronTaskScheduler`
- Documentation: [cron.md](cron.md)
- Runtime status: implemented

Cron performs scheduled work and can trigger model runs. Cron itself does not
own a model selection. For operator-backed work, cron owns timing only; the
task handler or operator module resolves provider and model from `StoreService`
at execution time.

Cron is its own main-process operator module. It should not contain provider
adapters for assistant, TTS, STT, image, video, sound, or OCR work.

State and runtime:

- Managed schedules persist under `cronScheduler`.
- Friday tool schedules persist under `fridayCron`.
- Friday cron `agentTurn` payloads may include `providerId`, `model`,
  `thinking`, `lightContext`, and `toolsAllow`.
- `AgentServiceFridayCronExecutor` converts those ids into `AgentSendOptions`.
- `AgentService` resolves actual provider records and model execution settings.
- Media schedules should use task types such as `text-to-speech.run`,
  `image.create`, `video.create`, or `sound.create` and store only sanitized
  task input.
- Cron payloads must not store API keys, base URLs, webhook secrets, or raw
  provider records.

Cron IPC:

- `cron:createSchedule`
- `cron:updateSchedule`
- `cron:pauseSchedule`
- `cron:resumeSchedule`
- `cron:deleteSchedule`
- `cron:listSchedules`
- `cron:runNow`
- `cron:action`
- `cron:event`

System-event cron jobs can wake heartbeat instead of directly running an
assistant turn when the target is the main session.

## Background Task

- Stable id: `background-task`
- Operator field: `operator.backgroundTask`
- Documentation: [task-manager.md](task-manager.md)
- Runtime status: implemented for `agent.run` and `ocr.run`

The task manager is the operator boundary for immediate background work. It
does not choose providers or models itself. Each registered task handler
resolves its own operator configuration or calls an operator module that does.

Background task is its own main-process operator module. It owns task lifecycle
and task registry behavior, not provider-specific runtime logic for other
operators.

Current registered task handlers:

- `agent.run`: validates a message and optional provider/model ids, then calls
  `AgentService.send()`.
- `ocr.run`: validates image input, then calls the configured OCR endpoint.

Recommended operator-backed task handlers:

- `text-to-speech.run`: validates text and audio options, then calls the TTS
  module.
- `image.create`: validates prompt and image options, then calls the image
  module.
- `video.create`: validates prompt and video options, then calls the video
  module.
- `sound.create`: validates prompt and audio options, then calls the sound
  module.

Task payloads should not include credentials or provider records. Provider and
model selection comes from the matching operator in `StoreService`.

Task IPC:

- `tasks:start`
- `tasks:list`
- `tasks:get`
- `tasks:cancel`
- `tasks:event`

Task records are in-memory only. Task inputs, metadata, progress, results, and
errors are sanitized before they are stored on records.
