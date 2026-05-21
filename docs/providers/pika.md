# Pika Provider

| Property | Value |
| --- | --- |
| Provider id | `pika` |
| Display name | Pika |
| Capabilities | Video |
| Default base URL | `https://pika.art` |
| Credential type | Fal API key for official Pika API access via Fal; third-party Pika keys also exist |
| Auth method | `FAL_KEY` / API key authentication |
| Recommended env vars | `FAL_KEY`, `PIKA_API_KEY` |
| API-key link | [Fal API keys](https://fal.ai/dashboard/keys) |
| Official docs | [Pika API](https://pika.art/api) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Video Models | `pika-2.5`, `pika-pro`, `pika-turbo` |

## Video Models

| Model id | Status |
| --- | --- |
| `pika-2.5` | `active` |
| `pika-pro` | `active` |
| `pika-turbo` | `active` |

## Related Docs

- [Provider catalog](index.md)
