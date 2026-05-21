# Tasks

This document indexes Friday's task-related modules and the task types they
own or dispatch.

## Task Modules

| Module | Store key | Documentation | Purpose |
| --- | --- | --- | --- |
| Background task | `backgroundTask` | [background.md](background.md) | Runs immediate in-memory tasks through registered handlers. |
| Task scheduler | `taskScheduler` | [scheduled.md](scheduled.md) | Persists schedules and creates due scheduled work. |

## Current Background Task Types

These task types are registered as user-facing background tasks at startup.

| Task type | Handler | Purpose | Related docs |
| --- | --- | --- | --- |
| `agent.run` | `AgentTaskHandler` | Runs an agent turn as a cancellable task. | [Large language model](../models/large-language-model.md) |
| `image.create` | `ImageCreateTaskHandler` | Runs text-to-image work through the image module. | [Text to image](../models/text-to-image.md) |
| `ocr.run` | `OcrTaskHandler` | Runs OCR extraction against the configured OCR endpoint/module. | [OCR](../models/ocr.md) |

## Planned Module-Backed Task Types

These task types are documented as module-backed work but are not all
registered as user-facing handlers today.

| Task type | Target module | Related docs |
| --- | --- | --- |
| `text-to-speech.run` | Text to speech | [Text to speech](../models/text-to-speech.md) |
| `speech-to-text.transcribe` | Speech to text | [Speech to text](../models/speech-to-text.md) |
| `video.create` | Text to video | [Text to video](../models/text-to-video.md) |
| `sound.create` | Text to audio | [Text to audio](../models/music-creator.md) |
| `embedding.index` | Embedding | [Embedding](../models/embedding.md) |

## Scheduled Task Types

Managed schedules store a `taskType` string plus sanitized `taskInput`.
The scheduler owns timing, persistence, missed-run handling, retries, and
auditing; the target handler or module owns execution.

Documented scheduled task examples include:

| Task type | Source | Purpose |
| --- | --- | --- |
| `image.create` | Module-backed schedule | Creates an image through the background task/image module path. |
| `cron.agentTurn` | Friday cron scheduler | Runs an agent turn from a Friday tool schedule. |
| `reminder.show` | Cron example | Demonstrates reminder-style scheduled work. |
| `cron.maintenance` | Cron example | Demonstrates maintenance scheduled work. |
| `memory.compact` | Cron example | Demonstrates memory compaction scheduled work. |
| `connector.sync` | Cron example | Demonstrates connector sync scheduled work. |
| `ai.agent.run` | Cron example | Demonstrates an agent scheduled task shape. |

Cron payloads must not store API keys, base URLs, webhook secrets, raw provider
records, or other credentials.

## Related Docs

- [Modules](../modules.md)
- [Store](../data/store.md)
- [Tools](../ai/tools.md)
