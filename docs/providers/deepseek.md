# DeepSeek Provider

| Property | Value |
| --- | --- |
| Provider id | `deepseek` |
| Display name | DeepSeek |
| Capabilities | Chat |
| Default base URL | `https://api.deepseek.com` |
| Credential type | API key |
| Auth method | OpenAI-compatible Bearer token |
| Recommended env vars | `DEEPSEEK_API_KEY` |
| API-key link | [DeepSeek API keys](https://platform.deepseek.com/api_keys) |
| Official docs | [DeepSeek API docs](https://api-docs.deepseek.com/) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `deepseek-v4-pro` | DeepSeek V4-Pro |
| `deepseek-v4-flash` | DeepSeek V4-Flash |

Runtime notes:

- Uses the dedicated DeepSeek adapter, which extends the OpenAI
  Chat Completions-compatible adapter.
- The adapter defaults to `https://api.deepseek.com` when no stored base URL is
  supplied.
- It can pass `reasoning_effort` values `low`, `medium`, or `high` when effort
  reaches the adapter; the main agent service currently only resolves effort for
  OpenAI.

Example:

```json
{
	"message": "Analyze this regression and suggest a focused test.",
	"providerId": "deepseek",
	"model": "deepseek-v4-pro"
}
```

## Related Docs

- [Provider catalog](index.md)
