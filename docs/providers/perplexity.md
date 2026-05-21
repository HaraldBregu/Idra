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

## Model Type Coverage

Official model references were checked in May 2026. Perplexity may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Research Chat Models | Sonar, Sonar Pro, Sonar Reasoning Pro, Sonar Deep Research, and R1-1776 style research/reasoning models with citations/search context. Official references: [Sonar Pro](https://docs.perplexity.ai/docs/sonar/models/sonar-pro), [Sonar Deep Research](https://docs.perplexity.ai/docs/sonar/models/sonar-deep-research), [Sonar Reasoning Pro](https://docs.perplexity.ai/docs/sonar/models/sonar-reasoning-pro). | Friday has an explicit default agent catalog for Perplexity. |

## Research Chat Models

Official references: [Sonar Pro](https://docs.perplexity.ai/docs/sonar/models/sonar-pro), [Sonar Deep Research](https://docs.perplexity.ai/docs/sonar/models/sonar-deep-research), [Sonar Reasoning Pro](https://docs.perplexity.ai/docs/sonar/models/sonar-reasoning-pro).

Official model families: Sonar, Sonar Pro, Sonar Reasoning Pro, Sonar Deep Research, and R1-1776 style research/reasoning models with citations/search context.

Friday status: Friday has an explicit default agent catalog for Perplexity.

## Runtime Notes

- Uses the generic OpenAI Chat Completions-compatible adapter.
- The provider is labeled as research chat in capabilities.
- Friday does not save or pass reasoning effort for Perplexity.

## Example

```json
{
	"message": "Research the latest context and cite what changed.",
	"providerId": "perplexity",
	"model": "sonar-pro"
}
```

## Related Docs

- [Provider catalog](index.md)
