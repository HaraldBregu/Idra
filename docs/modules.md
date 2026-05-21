# Modules

Friday modules are separated pieces of software. A module owns its runtime
boundary, dependencies, settings, and service API. Some modules can also be
wrapped as LLM tools, but tool exposure is only one possible surface for a
module.

Do not use "operator" as the product model for these pieces. Existing
implementation types and persisted settings keys may still contain
`Operator` or `operator.*` for compatibility, but documentation should describe
the product architecture in terms of modules.

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

| Module | Documentation | Main owner | Surfaces |
| --- | --- | --- | --- |
| Task scheduler | [task-scheduler.md](task-scheduler.md) | `src/main/cron` | Service, IPC, LLM tool `cron` |
| Background task | [background-task.md](background-task.md) | `src/main/tasks` | Service, IPC, LLM tool `task` |
| Agent | [agent.md](agent.md) | `src/main/agent` and `AgentService` | Service only for now |
| Speech to text | [speech-to-text.md](speech-to-text.md) | `src/main/stt` | Service, future/optional LLM tool |
| Text to speech | [text-to-speech.md](text-to-speech.md) | Future `src/main/tts` | Service, future/optional LLM tool |
| Image | [image-creator.md](image-creator.md) | Future `src/main/image` | Service, future/optional LLM tool |
| Video | [video-creator.md](video-creator.md) | Future `src/main/video` | Service, future/optional LLM tool |
| Sound | [music-creator.md](music-creator.md) | Future `src/main/sound` | Service, future/optional LLM tool |
| OCR | [ocr.md](ocr.md) | Current `ocr.run` handler, future `src/main/ocr` | Service, future/optional LLM tool |
| Embedding | [embedding.md](embedding.md) | Future `src/main/embedding` | Service, future/optional LLM tool |

## Tool And Service Boundaries

The task scheduler and background task modules are already valid LLM tool
surfaces because they expose scheduling and immediate task creation as explicit
agent actions.

The agent module is different: it is a service that runs agent turns. It should
not be exposed as a direct LLM tool for now. Other modules may call the agent
service through validated paths, such as the `agent.run` background task handler
or Friday cron `agentTurn` jobs.

TTS, STT, image, video, sound, OCR, and embedding are module services first.
They may also have LLM tools, but those tools must stay thin wrappers around the
module service and must not own provider/model selection or credentials.
