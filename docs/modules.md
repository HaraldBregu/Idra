# Modules

Friday modules are separated pieces of software. A module owns its runtime
boundary, dependencies, root store settings, and service API. Some modules can
also be wrapped as LLM tools, but tool exposure is only one possible surface
for a module.

Store settings are documented in [store.md](store.md). Each module owns one
root-level store property.

Use module terminology for product architecture, documentation, UI descriptions,
and future runtime boundaries.

## Rules

- Each module owns its dependencies and hides provider-specific behavior behind
  adapters.
- Credentials stay on configured provider or connector records, never in task,
  schedule, channel, or tool payloads.
- Tool wrappers call modules; they do not become the module boundary.
- Service APIs are main-process boundaries that UI, IPC, tasks, schedules, and
  tools can call after validation.
- Provider/model overrides may pass ids only. API keys, base URLs, webhook
  secrets, and raw provider records must still resolve from `StoreService`.

## Module Inventory

| Module | Store key | Documentation | Surfaces |
| --- | --- | --- | --- |
| Task scheduler | `taskScheduler` | [scheduled.md](tasks/scheduled.md) | Service, IPC, LLM tool `cron` |
| Background task | `backgroundTask` | [background.md](tasks/background.md) | Service, IPC, LLM tool `task` |
| Agent | `agent` | [large-language-model.md](models/large-language-model.md) | Service only for now |
| Speech to text | `speechToText` | [speech-to-text.md](models/speech-to-text.md) | Service, future/optional LLM tool |
| Text to speech | `textToSpeech` | [text-to-speech.md](models/text-to-speech.md) | Service, future/optional LLM tool |
| Text to image | `imageCreator` | [text-to-image.md](models/text-to-image.md) | Service, future/optional LLM tool |
| Text to video | `textToVideo` | [text-to-video.md](models/text-to-video.md) | Service, future/optional LLM tool |
| Sound | `sound` | [music-creator.md](models/music-creator.md) | Service, future/optional LLM tool |
| OCR | `ocr` | [ocr.md](models/ocr.md) | Service, future/optional LLM tool |
| Embedding | `embedding` | [embedding.md](models/embedding.md) | Service, future/optional LLM tool |

## Tool And Service Boundaries

The task scheduler and background task modules are already valid LLM tool
surfaces because they expose scheduling and immediate task creation as explicit
agent actions.

The agent module is different: it is a service that runs agent turns. It should
not be exposed as a direct LLM tool for now. Other modules may call the agent
service through validated paths, such as the `agent.run` background task handler
or Friday cron `agentTurn` jobs.

TTS, STT, text-to-image, video, sound, OCR, and embedding are module services
first. They may also have LLM tools, but those tools must stay thin wrappers
around the module service and must not own provider/model selection or
credentials.
