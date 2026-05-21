# Luma AI Provider

| Property | Value |
| --- | --- |
| Provider id | `luma` |
| Display name | Luma AI |
| Capabilities | Omni - Image - Video - 3D |
| Default base URL | `https://api.lumalabs.ai/dream-machine/v1` |
| Credential type | API key |
| Auth method | API key authentication |
| Recommended env vars | `LUMA_API_KEY` |
| API-key link | [Luma API keys](https://lumalabs.ai/dream-machine/api/keys) |
| Official docs | [Luma docs](https://docs.lumalabs.ai/docs/welcome) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `uni-1` | Uni-1 |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter if selected for
  the main agent.
- Confirm endpoint compatibility before using Luma as the main agent provider.
- Friday does not save or pass reasoning effort for Luma.

Example:

```json
{
	"message": "Describe a storyboard for this product demo.",
	"providerId": "luma",
	"model": "uni-1"
}
```

## Related Docs

- [Provider catalog](index.md)
