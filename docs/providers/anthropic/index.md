# Anthropic Provider

| Property | Value |
| --- | --- |
| Provider id | `anthropic` |
| Display name | Anthropic |
| Capabilities | Chat |
| Default base URL | `https://api.anthropic.com` |
| Credential type | API key |
| Auth method | `x-api-key` header plus `anthropic-version` header |
| Recommended env vars | `ANTHROPIC_API_KEY` |
| API-key link | [Anthropic API keys](https://console.anthropic.com/settings/keys) |
| Official docs | [Anthropic API overview](https://platform.claude.com/docs/en/api/overview) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Large Language Models | `claude-opus-4-7`, `claude-sonnet-4-6` |

## Large Language Models

| Model id | Status |
| --- | --- |
| `claude-opus-4-7` | `active` |
| `claude-sonnet-4-6` | `active` |

## Related Docs

- [Provider catalog](index.md)
