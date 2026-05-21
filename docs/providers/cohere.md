# Cohere Provider

| Property | Value |
| --- | --- |
| Provider id | `cohere` |
| Display name | Cohere |
| Capabilities | Chat - Speech-to-text |
| Default base URL | `https://api.cohere.com` |
| Credential type | API key |
| Auth method | Bearer/API key auth via official SDKs |
| Recommended env vars | `COHERE_API_KEY` |
| API-key link | [Cohere API keys](https://dashboard.cohere.com/api-keys) |
| Official docs | [Cohere API reference](https://docs.cohere.com/reference/about) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `command-a-03-2025` | Command A |
| `command-a-reasoning-08-2025` | Command A Reasoning |
| `command-a-vision-07-2025` | Command A Vision |
| `aya-vision` | Aya Vision |

Speech-to-text models:

| Model id | Display name | Runtime style |
| --- | --- | --- |
| `cohere-transcribe-03-2026` | Cohere Transcribe | File transcription |

Runtime notes:

- No dedicated Cohere adapter is registered.
- `makeProvider` falls back to the generic OpenAI Chat Completions-compatible
  adapter for this id.
- Confirm endpoint compatibility before using Cohere as the main agent
  provider.

Example:

```json
{
	"message": "Summarize the customer feedback by product area.",
	"providerId": "cohere",
	"model": "command-a-03-2025"
}
```

## Related Docs

- [Provider catalog](index.md)
