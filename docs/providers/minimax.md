# MiniMax Provider

| Property | Value |
| --- | --- |
| Provider id | `minimax` |
| Display name | MiniMax |
| Capabilities | Chat - Text-to-speech - Video - Music/audio |
| Default base URL | `https://api.minimax.io/v1` |
| Credential type | API key; Token Plan key is separate |
| Auth method | API key / Bearer token |
| Recommended env vars | `MINIMAX_API_KEY` |
| API-key link | [MiniMax interface keys](https://platform.minimax.io/user-center/basic-information/interface-key) |
| Official docs | [MiniMax API overview](https://platform.minimax.io/docs/api-reference/api-overview) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Large Language Models | `MiniMax-M2.7`, `MiniMax-M2.5` |
| Text-To-Speech Models | `Speech-2.8-HD`, `Speech-2.8-Turbo` |
| Video Models | `MiniMax-Hailuo-2.3`, `MiniMax-Hailuo-2.3-Fast`, `MiniMax-Hailuo-02` |
| Music And Audio Models | `music-2.6`, `music-cover` |

## Large Language Models

| Model id | Status |
| --- | --- |
| `MiniMax-M2.7` | `active` |
| `MiniMax-M2.5` | `active` |

## Text-To-Speech Models

| Model id | Status |
| --- | --- |
| `Speech-2.8-HD` | `active` |
| `Speech-2.8-Turbo` | `active` |

## Video Models

| Model id | Status |
| --- | --- |
| `MiniMax-Hailuo-2.3` | `active` |
| `MiniMax-Hailuo-2.3-Fast` | `active` |
| `MiniMax-Hailuo-02` | `active` |

## Music And Audio Models

| Model id | Status |
| --- | --- |
| `music-2.6` | `active` |
| `music-cover` | `active` |

## Related Docs

- [Provider catalog](index.md)
