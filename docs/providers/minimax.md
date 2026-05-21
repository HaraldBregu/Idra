# MiniMax Provider

| Property | Value |
| --- | --- |
| Provider id | `minimax` |
| Display name | MiniMax |
| Capabilities | Chat - Text-to-speech - Video - Music |
| Default base URL | `https://api.minimax.io/v1` |
| Credential type | API key; Token Plan key is separate |
| Auth method | API key / Bearer token |
| Recommended env vars | `MINIMAX_API_KEY` |
| API-key link | [MiniMax interface keys](https://platform.minimax.io/user-center/basic-information/interface-key) |
| Official docs | [MiniMax API overview](https://platform.minimax.io/docs/api-reference/api-overview) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `minimax-m2.7` | MiniMax M2.7 |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Pay-as-you-go API keys and Token Plan keys are separate.
- Friday does not save or pass reasoning effort for MiniMax.

Example:

```json
{
	"message": "Rewrite this customer response with a concise professional tone.",
	"providerId": "minimax",
	"model": "minimax-m2.7"
}
```

## Related Docs

- [Provider catalog](index.md)
