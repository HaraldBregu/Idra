# Runway Provider

| Property | Value |
| --- | --- |
| Provider id | `runway` |
| Display name | Runway |
| Capabilities | Video |
| Default base URL | `https://api.dev.runwayml.com/v1` |
| Credential type | API key |
| Auth method | API key authentication |
| Recommended env vars | `RUNWAYML_API_SECRET`, `RUNWAY_API_KEY` |
| API-key link | [Runway developer portal](https://dev.runwayml.com/) |
| Official docs | [Runway API setup](https://docs.dev.runwayml.com/guides/setup/) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Video Models | `gen4.5`, `gen4_turbo`, `gen4_aleph` |

## Video Models

| Model id | Status |
| --- | --- |
| `gen4.5` | `active` |
| `gen4_turbo` | `active` |
| `gen4_aleph` | `active` |

## Related Docs

- [Provider catalog](index.md)
