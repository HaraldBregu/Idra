# Kuaishou / Kling AI Provider

| Property | Value |
| --- | --- |
| Provider id | `kling` |
| Display name | Kuaishou / Kling AI |
| Capabilities | Video - Music/audio |
| Default base URL | `https://kling.ai` |
| Credential type | Access key and secret key |
| Auth method | Kling developer API authentication using access/secret credentials |
| Recommended env vars | `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` |
| API-key link | [Kling API keys](https://app.klingai.com/global/dev/account/apiKey) |
| Official docs | [Kling API overview](https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Video Models | `kling-2.6`, `kling-2.1` |
| Music And Audio Models | `kling-audio` |

## Video Models

| Model id | Status |
| --- | --- |
| `kling-2.6` | `verify` |
| `kling-2.1` | `verify` |

## Music And Audio Models

| Model id | Status |
| --- | --- |
| `kling-audio` | `verify` |

## Related Docs

- [Provider catalog](index.md)
