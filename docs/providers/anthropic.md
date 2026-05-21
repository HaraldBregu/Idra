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

## Model Type Coverage

Official model references were checked in May 2026. Anthropic may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | Claude Opus, Sonnet, and Haiku model families with text and image input and text output. Official references: [Anthropic models overview](https://docs.anthropic.com/en/docs/about-claude/models/all-models). | Friday has an explicit default agent catalog for Anthropic. |

## Large Language Models

Official references: [Anthropic models overview](https://docs.anthropic.com/en/docs/about-claude/models/all-models).

Official model families: Claude Opus, Sonnet, and Haiku model families with text and image input and text output.

Friday status: Friday has an explicit default agent catalog for Anthropic.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `claude-opus-4-7` | Claude Opus 4.7 |
| `claude-opus-4-6` | Claude Opus 4.6 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 |
| `claude-sonnet-4-5` | Claude Sonnet 4.5 |
| `claude-haiku-4-5` | Claude Haiku 4.5 |

## Runtime Notes

- Uses the Anthropic Messages adapter.
- Tool calls are translated into Anthropic `tool_use` blocks.
- Tool results are sent back as user messages containing `tool_result` blocks.
- Friday does not save or pass reasoning effort for Anthropic.

## Example

```json
{
	"message": "Inspect the product spec and identify missing edge cases.",
	"providerId": "anthropic",
	"model": "claude-sonnet-4-6"
}
```

## Related Docs

- [Provider catalog](index.md)
