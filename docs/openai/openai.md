# OpenAI Provider

| Property | Value |
| --- | --- |
| Provider id | `openai` |
| Display name | OpenAI |
| Capabilities | Chat - Speech-to-text - Text-to-speech - Realtime voice/omni - Image - Video |
| Default base URL | `https://api.openai.com/v1` |
| Credential type | API key |
| Auth method | HTTP Bearer token |
| Recommended env vars | `OPENAI_API_KEY` |
| API-key link | [OpenAI API keys](https://platform.openai.com/api-keys) |
| Official docs | [OpenAI quickstart](https://developers.openai.com/api/docs/quickstart) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Large Language Models | `gpt-5.5`, `gpt-5.4-mini` |
| Speech-To-Text Models | `gpt-4o-transcribe`, `gpt-4o-mini-transcribe` |
| Text-To-Speech Models | `gpt-4o-mini-tts`, `tts-1-hd` |
| Realtime Voice And Omni Models | `gpt-realtime-2`, `gpt-realtime` |
| Image Models | `gpt-image-2`, `gpt-image-1.5`, `gpt-image-1-mini` |
| Video Models | `sora-2-pro`, `sora-2` |

## Large Language Models

| Model id | Status |
| --- | --- |
| `gpt-5.5` | `active` |
| `gpt-5.4-mini` | `active` |

## Speech-To-Text Models

| Model id | Status |
| --- | --- |
| `gpt-4o-transcribe` | `active` |
| `gpt-4o-mini-transcribe` | `active` |

## Text-To-Speech Models

| Model id | Status |
| --- | --- |
| `gpt-4o-mini-tts` | `active` |
| `tts-1-hd` | `active` |

## Realtime Voice And Omni Models

| Model id | Status |
| --- | --- |
| `gpt-realtime-2` | `active` |
| `gpt-realtime` | `active` |

## Image Models

| Model id | Status |
| --- | --- |
| `gpt-image-2` | `active` |
| `gpt-image-1.5` | `active` |
| `gpt-image-1-mini` | `active` |

## Video Models

| Model id | Status |
| --- | --- |
| `sora-2-pro` | `deprecated` |
| `sora-2` | `deprecated` |

## Related Docs

- [Provider catalog](index.md)
