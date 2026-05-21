# Stability AI Provider

| Property | Value |
| --- | --- |
| Provider id | `stability-ai` |
| Display name | Stability AI |
| Capabilities | Image - Video - Music/audio |
| Default base URL | `https://api.stability.ai/v2beta` |
| Credential type | API key |
| Auth method | `Authorization: Bearer <api_key>` |
| Recommended env vars | `STABILITY_API_KEY` |
| API-key link | [Stability API keys](https://platform.stability.ai/account/keys) |
| Official docs | [Stability getting started](https://platform.stability.ai/docs/getting-started) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Image Models | `stable-image-ultra`, `stable-image-core` |
| Video Models | `stable-video` |
| Music And Audio Models | `stable-audio-2.5` |

## Image Models

| Model id | Status |
| --- | --- |
| `stable-image-ultra` | `active` |
| `stable-image-core` | `active` |

## Video Models

| Model id | Status |
| --- | --- |
| `stable-video` | `active` |

## Music And Audio Models

| Model id | Status |
| --- | --- |
| `stable-audio-2.5` | `active` |

## Related Docs

- [Provider catalog](index.md)
