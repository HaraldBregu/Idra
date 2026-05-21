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

Default agent models:

| Model id | Display name |
| --- | --- |
| `llama-4-maverick` | Llama 4 Maverick |
| `llama-4-scout` | Llama 4 Scout |
| `llama-3.3-70b` | Llama 3.3 70B |

Runtime notes:

- No dedicated Meta adapter is registered.
- `makeProvider` falls back to the generic OpenAI Chat Completions-compatible
  adapter for this id.
- Confirm that the configured endpoint is OpenAI-compatible before using Meta
  as the main agent provider.

Example:

```json
{
	"message": "Draft a concise architectural decision record.",
	"providerId": "meta",
	"model": "llama-4-maverick"
}
```

## Related Docs

- [Provider catalog](index.md)
