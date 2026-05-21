# ElevenLabs Provider

| Property | Value |
| --- | --- |
| Provider id | `elevenlabs` |
| Display name | ElevenLabs |
| Capabilities | Speech-to-text - Text-to-speech - Music/audio |
| Default base URL | `https://api.elevenlabs.io/v1` |
| Credential type | API key |
| Auth method | `xi-api-key` header |
| Recommended env vars | `ELEVENLABS_API_KEY` |
| API-key link | [ElevenLabs API keys](https://elevenlabs.io/app/settings/api-keys) |
| Official docs | [ElevenLabs authentication docs](https://elevenlabs.io/docs/api-reference/authentication) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Speech-To-Text Models | `scribe_v2`, `scribe_v2_realtime` |
| Text-To-Speech Models | `eleven_v3`, `eleven_multilingual_v2`, `eleven_flash_v2_5` |
| Music And Audio Models | `eleven-music`, `elevenlabs-sound-effects` |

## Speech-To-Text Models

| Model id | Status |
| --- | --- |
| `scribe_v2` | `active` |
| `scribe_v2_realtime` | `active` |

## Text-To-Speech Models

| Model id | Status |
| --- | --- |
| `eleven_v3` | `active` |
| `eleven_multilingual_v2` | `active` |
| `eleven_flash_v2_5` | `active` |

## Music And Audio Models

| Model id | Status |
| --- | --- |
| `eleven-music` | `active` |
| `elevenlabs-sound-effects` | `active` |

## Related Docs

- [Provider catalog](index.md)
