# Mistral AI Provider

| Property | Value |
| --- | --- |
| Provider id | `mistral` |
| Display name | Mistral AI |
| Capabilities | Chat - Speech-to-text - Text-to-speech |
| Default base URL | `https://api.mistral.ai/v1` |
| Credential type | API key |
| Auth method | HTTP Bearer token |
| Recommended env vars | `MISTRAL_API_KEY` |
| API-key link | [Mistral API keys](https://admin.mistral.ai/organization/api-keys) |
| Official docs | [Mistral quickstarts](https://docs.mistral.ai/getting-started/quickstarts) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Large Language Models | `mistral-large-2512`, `mistral-medium-3-5`, `devstral-2512` |
| Speech-To-Text Models | `voxtral-mini-2602`, `voxtral-mini-transcribe-realtime-2602` |
| Text-To-Speech Models | `voxtral-tts-2603` |

## Large Language Models

| Model id | Status |
| --- | --- |
| `mistral-large-2512` | `active` |
| `mistral-medium-3-5` | `active` |
| `devstral-2512` | `active` |

## Speech-To-Text Models

| Model id | Status |
| --- | --- |
| `voxtral-mini-2602` | `active` |
| `voxtral-mini-transcribe-realtime-2602` | `active` |

## Text-To-Speech Models

| Model id | Status |
| --- | --- |
| `voxtral-tts-2603` | `active` |

## Related Docs

- [Provider catalog](index.md)
