# Perplexity Provider

| Property | Value |
| --- | --- |
| Provider id | `perplexity` |
| Display name | Perplexity |
| Capabilities | Research chat |
| Default base URL | `https://api.perplexity.ai` |
| Credential type | API key |
| Auth method | Bearer token |
| Recommended env vars | `PPLX_API_KEY`, `PERPLEXITY_API_KEY` |
| API-key link | [Perplexity API settings](https://www.perplexity.ai/settings/api) |
| Official docs | [Perplexity API key management](https://docs.perplexity.ai/docs/admin/api-key-management) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `sonar-reasoning-pro` | Sonar Reasoning Pro |
| `sonar-pro` | Sonar Pro |
| `sonar-deep-research` | Sonar Deep Research |
| `r1-1776` | R1 1776 |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- The provider is labeled as research chat in capabilities.
- Friday does not save or pass reasoning effort for Perplexity.

Example:

```json
{
	"message": "Research the latest context and cite what changed.",
	"providerId": "perplexity",
	"model": "sonar-pro"
}
```

## Related Docs

- [Provider catalog](index.md)
