# Reka AI Provider

| Property | Value |
| --- | --- |
| Provider id | `reka` |
| Display name | Reka AI |
| Capabilities | Chat |
| Default base URL | `https://api.reka.ai/v1` |
| Credential type | API key |
| Auth method | API key authentication |
| Recommended env vars | `REKA_API_KEY` |
| API-key link | [Reka platform](https://platform.reka.ai/) |
| Official docs | [Reka quickstart](https://docs.reka.ai/quickstart) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `reka-core` | Reka Core |
| `reka-flash` | Reka Flash |
| `reka-edge` | Reka Edge |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Confirm endpoint compatibility before using Reka as the main agent provider.
- Friday does not save or pass reasoning effort for Reka.

Example:

```json
{
	"message": "Review this incident report and list follow-up actions.",
	"providerId": "reka",
	"model": "reka-core"
}
```

## Related Docs

- [Provider catalog](index.md)
