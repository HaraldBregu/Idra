# Moonshot AI / Kimi Provider

| Property | Value |
| --- | --- |
| Provider id | `kimi` |
| Display name | Moonshot AI / Kimi |
| Capabilities | Chat |
| Default base URL | `https://api.moonshot.ai/v1` |
| Credential type | API key |
| Auth method | API key / OpenAI-compatible Bearer token |
| Recommended env vars | `MOONSHOT_API_KEY`, `KIMI_API_KEY` |
| API-key link | [Moonshot API keys](https://platform.moonshot.ai/console/api-keys) |
| Official docs | [Moonshot platform](https://platform.moonshot.ai/) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `kimi-k2.6` | Kimi K2.6 |
| `kimi-k2.5` | Kimi K2.5 |
| `kimi-k2` | Kimi K2 |
| `kimi-latest` | Kimi Latest |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Friday does not save or pass reasoning effort for Kimi.

Example:

```json
{
	"message": "Summarize this long document and preserve the action items.",
	"providerId": "kimi",
	"model": "kimi-latest"
}
```

## Related Docs

- [Provider catalog](index.md)
