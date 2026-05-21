# xAI Provider

| Property | Value |
| --- | --- |
| Provider id | `xai` |
| Display name | xAI |
| Capabilities | Chat - Realtime voice - Image - Video |
| Default base URL | `https://api.x.ai/v1` |
| Credential type | API key |
| Auth method | HTTP Bearer token |
| Recommended env vars | `XAI_API_KEY` |
| API-key link | [xAI console](https://console.x.ai/) |
| Official docs | [xAI quickstart](https://docs.x.ai/developers/quickstart) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `grok-4.3` | Grok 4.3 |
| `grok-4.3-fast` | Grok 4.3 Fast |
| `grok-code-fast` | Grok Code Fast |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Friday does not save or pass reasoning effort for xAI.

Example:

```json
{
	"message": "Explain the failing test and propose a direct fix.",
	"providerId": "xai",
	"model": "grok-code-fast"
}
```

## Related Docs

- [Provider catalog](index.md)
