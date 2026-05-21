# Meta Provider

| Property | Value |
| --- | --- |
| Provider id | `meta` |
| Display name | Meta |
| Capabilities | Chat - Video |
| Default base URL | `https://ai.meta.com` |
| Credential type | Llama API key |
| Auth method | API key authentication |
| Recommended env vars | `LLAMA_API_KEY` |
| API-key link | [Meta Llama developer portal](https://llama.developer.meta.com/) |
| Official docs | [Meta Llama API keys](https://llama.developer.meta.com/docs/api-keys/) |

## Model Type Coverage

Official model references were checked in May 2026. Meta may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | Llama API model families such as Llama 4 and Llama 3.x; the official Llama API docs may require login. Official references: [Llama API models](https://llama.developer.meta.com/docs/models/), [Meta AI resources](https://ai.meta.com/resources/). | Friday has an explicit default agent catalog for Meta. |
| Video Models | Meta publishes video and world-model research resources; a generally available model API should be verified before runtime work. Official references: [Meta AI resources](https://ai.meta.com/resources/). | Friday exposes the shared `video-provider-coming-soon` placeholder for Meta video generation. |

## Large Language Models

Official references: [Llama API models](https://llama.developer.meta.com/docs/models/), [Meta AI resources](https://ai.meta.com/resources/).

Official model families: Llama API model families such as Llama 4 and Llama 3.x; the official Llama API docs may require login.

Friday status: Friday has an explicit default agent catalog for Meta.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `llama-4-maverick` | Llama 4 Maverick |
| `llama-4-scout` | Llama 4 Scout |
| `llama-3.3-70b` | Llama 3.3 70B |

## Video Models

Official references: [Meta AI resources](https://ai.meta.com/resources/).

Official model families: Meta publishes video and world-model research resources; a generally available model API should be verified before runtime work.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for Meta video generation.

## Runtime Notes

- No dedicated Meta adapter is registered.
- `makeProvider` falls back to the generic OpenAI Chat Completions-compatible
  adapter for this id.
- Confirm that the configured endpoint is OpenAI-compatible before using Meta
  as the main agent provider.

## Example

```json
{
	"message": "Draft a concise architectural decision record.",
	"providerId": "meta",
	"model": "llama-4-maverick"
}
```

## Related Docs

- [Provider catalog](index.md)
