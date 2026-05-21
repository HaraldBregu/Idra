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

## Assistant

- Stable id: `friday`
- Runtime id: `main`
- Operator field: `operator.assistant`
- Documentation: [agent.md](agent.md)
- Runtime status: implemented through `AgentService.send`

The Friday assistant stores its default provider and model on
`operator.assistant`. Provider credentials stay on the matching provider record
under `providers`.

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
- Documentation: `text-to-speech.md`
- Runtime status: pending runtime

Text-to-speech is listed in Settings with:

- Provider id: `elevenlabs`
- Model id: `rachel-multilingual`

The UI is read-only today. Before this operator runs work, add a StoreService
slot, IPC save/load handlers, and a runtime adapter that resolves the selected
provider and model from settings.

## Image Creator

- Stable id: `image-assistant`
- Operator field: `operator.imageCreator`
- Documentation: `image-creator.md`
- Runtime status: pending runtime

Image creator is listed in Settings as a placeholder with model
`image-provider-coming-soon`.

Before this operator generates output, it needs a persisted provider/model
selection, a runtime adapter, and task or UI entry points that pass only ids
into execution.

## Video Creator

- Stable id: `video-creator`
- Operator field: `operator.videoCreator`
- Documentation: `video-creator.md`
- Runtime status: pending runtime

Video creator is listed in Settings as a placeholder with model
`video-provider-coming-soon`.

Before this operator generates output, it needs a persisted provider/model
selection, a runtime adapter, and task or UI entry points that pass only ids
into execution.

## Music Creator

- Stable id: `music-creator`
- Operator field: `operator.musicCreator`
- Documentation: `music-creator.md`
- Runtime status: pending runtime

Music creator is listed in Settings as a placeholder with model
`music-provider-coming-soon`.

Before this operator generates output, it needs a persisted provider/model
selection, a runtime adapter, and task or UI entry points that pass only ids
into execution.

## Document Reader OCR

- Stable id: `document-reader`
- Task type: `ocr.run`
- Operator field: `operator.documentReaderOcr`
- Documentation: `document-reader-ocr.md`
- Runtime status: OCR task implemented; provider/model picker pending

The document reader settings row is a placeholder, but OCR execution exists as
the `ocr.run` task handler.

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
own a model selection.

State and runtime:

- Managed schedules persist under `cronScheduler`.
- Friday tool schedules persist under `fridayCron`.
- Friday cron `agentTurn` payloads may include `providerId`, `model`,
  `thinking`, `lightContext`, and `toolsAllow`.
- `AgentServiceFridayCronExecutor` converts those ids into `AgentSendOptions`.
- `AgentService` resolves actual provider records and model execution settings.

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
resolves its own operator configuration.

Current registered task handlers:

- `agent.run`: validates a message and optional provider/model ids, then calls
  `AgentService.send()`.
- `ocr.run`: validates image input, then calls the configured OCR endpoint.

Task IPC:

- `tasks:start`
- `tasks:list`
- `tasks:get`
- `tasks:cancel`
- `tasks:event`

Task records are in-memory only. Task inputs, metadata, progress, results, and
errors are sanitized before they are stored on records.
