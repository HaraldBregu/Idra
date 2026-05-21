# Google DeepMind / Google Provider

| Property | Value |
| --- | --- |
| Provider id | `google` |
| Display name | Google DeepMind / Google |
| Capabilities | Chat - Text-to-speech - Realtime voice/omni - Image - Video - Music/audio |
| Default base URL | `https://generativelanguage.googleapis.com/v1beta/openai` |
| Credential type | Gemini API key / Google Cloud credentials depending on service |
| Auth method | API key parameter/header for Gemini Developer API; Google Cloud IAM/auth for Vertex/Cloud APIs |
| Recommended env vars | `GEMINI_API_KEY`, `GOOGLE_API_KEY` |
| API-key link | [Google AI Studio API keys](https://aistudio.google.com/app/apikey) |
| Official docs | [Gemini API key docs](https://ai.google.dev/gemini-api/docs/api-key) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Large Language Models | `gemini-3.1-pro-preview`, `gemini-3.1-flash-lite` |
| Text-To-Speech Models | `gemini-3.1-flash-tts-preview` |
| Realtime Voice And Omni Models | `gemini-3.1-flash-live-preview` |
| Image Models | `gemini-3.1-flash-image-preview`, `gemini-3-pro-image-preview` |
| Video Models | `veo-3.1`, `veo-3.1-fast` |
| Music And Audio Models | `lyria-3-pro-preview`, `lyria-3-clip-preview`, `lyria-realtime` |

## Large Language Models

| Model id | Status |
| --- | --- |
| `gemini-3.1-pro-preview` | `active` |
| `gemini-3.1-flash-lite` | `active` |

## Text-To-Speech Models

| Model id | Status |
| --- | --- |
| `gemini-3.1-flash-tts-preview` | `active` |

## Realtime Voice And Omni Models

| Model id | Status |
| --- | --- |
| `gemini-3.1-flash-live-preview` | `active` |

## Image Models

| Model id | Status |
| --- | --- |
| `gemini-3.1-flash-image-preview` | `active` |
| `gemini-3-pro-image-preview` | `active` |

## Video Models

| Model id | Status |
| --- | --- |
| `veo-3.1` | `active` |
| `veo-3.1-fast` | `active` |

## Music And Audio Models

| Model id | Status |
| --- | --- |
| `lyria-3-pro-preview` | `active` |
| `lyria-3-clip-preview` | `active` |
| `lyria-realtime` | `active` |

## Related Docs

- [Provider catalog](index.md)
