# xAI Provider

| Property | Value |
| --- | --- |
| Provider id | `xai` |
| Display name | xAI |
| Capabilities | Chat - Speech-to-text - Realtime voice/omni - Image - Video |
| Default base URL | `https://api.x.ai/v1` |
| Credential type | API key |
| Auth method | HTTP Bearer token |
| Recommended env vars | `XAI_API_KEY` |
| API-key link | [xAI console](https://console.x.ai/) |
| Official docs | [xAI quickstart](https://docs.x.ai/developers/quickstart) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Large Language Models | `grok-4.3`, `grok-build-0.1` |
| Speech-To-Text Models | `xai-stt-batch`, `xai-stt-streaming` |
| Realtime Voice And Omni Models | `grok-voice-latest` |
| Image Models | `grok-imagine` |
| Video Models | `grok-imagine-video` |

## Large Language Models

| Model id | Status |
| --- | --- |
| `grok-4.3` | `active` |
| `grok-build-0.1` | `active` |

## Speech-To-Text Models

| Model id | Status |
| --- | --- |
| `xai-stt-batch` | `active` |
| `xai-stt-streaming` | `active` |

## Realtime Voice And Omni Models

| Model id | Status |
| --- | --- |
| `grok-voice-latest` | `active` |

## Image Models

| Model id | Status |
| --- | --- |
| `grok-imagine` | `active` |

## Video Models

| Model id | Status |
| --- | --- |
| `grok-imagine-video` | `active` |

## Related Docs

- [Provider catalog](index.md)
