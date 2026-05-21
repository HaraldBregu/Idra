# Operators

Operators are Friday services that perform user-visible work by using a
configured LLM provider, ML provider, model, endpoint, scheduler, or task
runtime. They are the product-level roles shown in Settings, not every internal
class.

## Source Of Truth

- `src/shared/service.ts`: shared operator settings shape, `Agent`, `Model`,
  reasoning effort, and operator model constants.
- `src/shared/providers.ts`: provider catalog, provider capabilities, official
  provider docs, and default agent model catalogs.
- `src/main/store/service.ts`: persisted provider records and operator
  selections.
- `src/main/service.ts`: Friday agent runtime and provider/model resolution.
- `src/main/ipc/app-ipc.ts`: provider and operator-selection IPC handlers.
- `src/main/ipc/realtime-transcription-ipc.ts`: speech-to-text runtime.
- `src/main/tasks`: in-memory background task manager and registered task
  handlers.
- `src/main/cron`: cron scheduler and Friday cron runtime.
- `src/renderer/src/pages/settings/pages/operators`: operator settings UI.

## Operator Contract

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

The target `Operator` interface contains every product-level operator. Operators
that are not runtime-backed yet should still appear here so Settings, docs, and
future runtime work share stable names.

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

## Current Operators

| Operator | Stable id | Operator doc | Operator interface field | Runtime status |
| --- | --- | --- | --- | --- |
| Assistant (Friday) | `friday`, runtime `main` | [agent.md](agent.md) | `operator.assistant` stores provider and model. Provider credentials are in `providers`. | Implemented through `AgentService.send`. |
| Speech to text | `speech-to-text` | `speech-to-text.md` | `operator.speechToText` stores provider and model. Currently OpenAI only. | Implemented through realtime transcription IPC. |
| Text to speech | `text-to-speech` | `text-to-speech.md` | `operator.textToSpeech` stores provider and model. Current placeholder uses provider `elevenlabs` and model `rachel-multilingual`. | Pending runtime. |
| Image creator | `image-assistant` | `image-creator.md` | `operator.imageCreator` stores provider and model. Current placeholder uses `image-provider-coming-soon`. | Pending runtime. |
| Video creator | `video-creator` | `video-creator.md` | `operator.videoCreator` stores provider and model. Current placeholder uses `video-provider-coming-soon`. | Pending runtime. |
| Music creator | `music-creator` | `music-creator.md` | `operator.musicCreator` stores provider and model. Current placeholder uses `music-provider-coming-soon`. | Pending runtime. |
| Document reader OCR | `document-reader`, task `ocr.run` | `document-reader-ocr.md` | `operator.documentReaderOcr` stores provider/model or endpoint configuration. Current OCR task reads endpoint `ocr`. | OCR task implemented; provider/model picker pending. |
| Cron task scheduler | `cron-task-scheduler` | [cron.md](cron.md) | `operator.cronTaskScheduler` describes scheduler state. Schedules persist in `cronScheduler` and `fridayCron`. | Implemented. |
| Background task | `background-task` | [task-manager.md](task-manager.md) | `operator.backgroundTask` describes registered task types such as `agent.run` and `ocr.run`. | Implemented for `agent.run` and `ocr.run`. |

Use the operator doc filename as the stable documentation target. If a target
file does not exist yet, this page is the current owner for that operator's
contract.

## Provider And Model Resolution

### Assistant (Friday)

The Friday assistant stores its default provider/model at `operator.assistant`.
`ProviderChannels.saveAgentService` validates the selected provider and model
before saving.

Execution path:

1. `AgentService.send()` reads `StoreService.getAgentService()`.
2. Optional send overrides can replace `providerId`, `model`, and `effort`.
3. `StoreService.getProviderById(providerId)` supplies API key and base URL.
4. `makeProvider()` creates the runtime adapter.
5. The selected model is passed into the provider-neutral agent loop.

`agent.run` background tasks and Friday cron `agentTurn` jobs can pass
provider/model ids as overrides. They still rely on stored provider records for
credentials.

### Speech To Text

Speech-to-text stores its selection at `operator.speechToText`.

Current constraints:

- Provider must be `openai`.
- Model must be `gpt-realtime-whisper`.
- Runtime socket model is `gpt-realtime` with transcription intent.
- The OpenAI API key and base URL come from the stored `openai` provider.

The realtime transcription IPC rejects startup when the speech transcriber is
not configured, the provider is not OpenAI, the selected model is not the
realtime whisper model, or the OpenAI provider record has no API key.

### Text To Speech

Text-to-speech is listed in Settings with:

- Operator id: `text-to-speech`
- Provider id: `elevenlabs`
- Model id: `rachel-multilingual`

The UI is read-only today. Before this operator runs work, add a StoreService
slot, IPC save/load handlers, and a runtime adapter that resolves the selected
provider and model from settings.

### Creative Operators

Image creator, video creator, and music creator are Settings-visible
placeholders today.

Current model constants:

- `image-assistant`: `image-provider-coming-soon`
- `video-creator`: `video-provider-coming-soon`
- `music-creator`: `music-provider-coming-soon`

Before any of these operators generate output, they need the same contract as
the Friday agent: a persisted provider/model selection, a runtime adapter, and
task or UI entry points that pass only ids into execution.

### Document Reader OCR

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

### Cron Task Scheduler

Cron is an operator because it performs scheduled work and can trigger model
runs. Cron itself does not own a model selection.

Resolution rules:

- Managed schedules persist under `cronScheduler`.
- Friday tool schedules persist under `fridayCron`.
- Friday cron `agentTurn` payloads may include `providerId`, `model`,
  `thinking`, `lightContext`, and `toolsAllow`.
- `AgentServiceFridayCronExecutor` converts those ids into `AgentSendOptions`.
- `AgentService` resolves actual provider records and model execution settings.

System-event cron jobs can wake heartbeat instead of directly running an agent
turn when the target is the main session.

### Background Task

The task manager is an operator boundary for immediate background work. It does
not choose providers or models itself.

Current registered task handlers:

- `agent.run`: validates a message and optional provider/model ids, then calls
  `AgentService.send()`.
- `ocr.run`: validates image input, then calls the configured OCR endpoint.

Task records are in-memory only. Task inputs, metadata, progress, results, and
errors are sanitized before they are stored on records.

## Settings And IPC

Provider settings:

- `provider:get-all`
- `provider:add`
- `provider:get-models`
- `provider:get-agent-service`
- `provider:save-agent-service`
- `provider:get-speech-transcriber-service`
- `provider:save-speech-transcriber-service`

Task settings:

- `tasks:start`
- `tasks:list`
- `tasks:get`
- `tasks:cancel`
- `tasks:event`

Cron settings:

- `cron:createSchedule`
- `cron:updateSchedule`
- `cron:pauseSchedule`
- `cron:resumeSchedule`
- `cron:deleteSchedule`
- `cron:listSchedules`
- `cron:runNow`
- `cron:action`
- `cron:event`

Speech-to-text runtime:

- `realtime-transcription:start`
- `realtime-transcription:append-audio`
- `realtime-transcription:finish`
- `realtime-transcription:cancel`
- `realtime-transcription:event`

## Adding An Operator

1. Add a stable operator id and display row in Settings.
2. Add shared model/provider constants in `src/shared/service.ts` only if the
   operator needs static default options.
3. Add a typed StoreService-backed selection for runtime-backed operators.
4. Add IPC load/save handlers for the selection.
5. Validate selectable providers and models before saving.
6. Implement the runtime adapter or task handler.
7. Resolve provider/model/credentials from StoreService at execution start.
8. Pass only ids through task, cron, channel, or renderer runtime payloads.
9. Redact secrets from logs, task records, events, and user-visible errors.
10. Add an operator documentation target and update the catalog table above.
