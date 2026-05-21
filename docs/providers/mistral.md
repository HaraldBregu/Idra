# Mistral AI Provider

| Property | Value |
| --- | --- |
| Provider id | `mistral` |
| Display name | Mistral AI |
| Capabilities | Chat - Speech-to-text - Text-to-speech |
| Default base URL | `https://api.mistral.ai/v1` |
| Credential type | API key |
| Auth method | HTTP Bearer token |
| Recommended env vars | `MISTRAL_API_KEY` |
| API-key link | [Mistral API keys](https://admin.mistral.ai/organization/api-keys) |
| Official docs | [Mistral quickstarts](https://docs.mistral.ai/getting-started/quickstarts) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `mistral-large-2512` | Mistral Large 3 |
| `mistral-large-latest` | Mistral Large Latest |
| `mistral-medium-2604` | Mistral Medium 3.5 |
| `mistral-medium-latest` | Mistral Medium Latest |
| `mistral-medium-2508` | Mistral Medium 3.1 |
| `mistral-small-2603` | Mistral Small 4 |
| `mistral-small-latest` | Mistral Small Latest |
| `ministral-14b-2512` | Ministral 3 14B |
| `ministral-14b-latest` | Ministral 3 14B Latest |
| `ministral-8b-2512` | Ministral 3 8B |
| `ministral-8b-latest` | Ministral 3 8B Latest |
| `ministral-3b-2512` | Ministral 3 3B |
| `ministral-3b-latest` | Ministral 3 3B Latest |
| `magistral-medium-2509` | Magistral Medium 1.2 |
| `magistral-medium-latest` | Magistral Medium Latest |

Runtime notes:

- Uses the dedicated Mistral adapter and Mistral SDK chat streaming.
- The adapter normalizes a base URL ending in `/v1` before passing it to the
  SDK.
- Tool calls are streamed with Mistral `toolCalls`.
- Adapter effort mapping exists for `none`, `high`, and `xhigh`, but the main
  agent service currently resolves effort only for OpenAI.

Example:

```json
{
	"message": "Implement the smallest change that satisfies this bug report.",
	"providerId": "mistral",
	"model": "mistral-large-latest"
}
```

## Related Docs

- [Provider catalog](index.md)
