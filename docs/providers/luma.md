# Luma AI Provider

| Property | Value |
| --- | --- |
| Provider id | `luma` |
| Display name | Luma AI |
| Capabilities | Realtime voice/omni - Image - Video - 3D |
| Default base URL | `https://api.lumalabs.ai/dream-machine/v1` |
| Credential type | API key |
| Auth method | API key authentication |
| Recommended env vars | `LUMA_API_KEY` |
| API-key link | [Luma API keys](https://lumalabs.ai/dream-machine/api/keys) |
| Official docs | [Luma docs](https://docs.lumalabs.ai/docs/welcome) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Realtime Voice And Omni Models | `uni-1.1` |
| Image Models | `uni-1.1` |
| Video Models | `ray3.14`, `ray3`, `ray2` |
| 3D Models | `genie`, `interactive-scenes` |

## Realtime Voice And Omni Models

| Model id | Status |
| --- | --- |
| `uni-1.1` | `active` |

## Image Models

| Model id | Status |
| --- | --- |
| `uni-1.1` | `active` |

## Video Models

| Model id | Status |
| --- | --- |
| `ray3.14` | `active` |
| `ray3` | `active` |
| `ray2` | `active` |

## 3D Models

| Model id | Status |
| --- | --- |
| `genie` | `verify` |
| `interactive-scenes` | `verify` |

## Related Docs

- [Provider catalog](index.md)
