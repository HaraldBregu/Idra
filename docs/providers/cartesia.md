# Cartesia Provider

| Property | Value |
| --- | --- |
| Provider id | `cartesia` |
| Display name | Cartesia |
| Capabilities | Text-to-speech |
| Default base URL | `https://api.cartesia.ai` |
| Credential type | API key; admin API keys for key-management endpoints |
| Auth method | `Authorization: Bearer <api_key>` plus `Cartesia-Version` header |
| Recommended env vars | `CARTESIA_API_KEY` |
| API-key link | [Cartesia keys](https://play.cartesia.ai/keys) |
| Official docs | [Cartesia API conventions](https://docs.cartesia.ai/use-the-api/api-conventions) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Text-To-Speech Models | `sonic-3.5`, `sonic-3` |

## Text-To-Speech Models

| Model id | Status |
| --- | --- |
| `sonic-3.5` | `active` |
| `sonic-3` | `active` |

## Related Docs

- [Provider catalog](index.md)
