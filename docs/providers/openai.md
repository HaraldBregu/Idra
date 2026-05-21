# OpenAI Provider

| Property | Value |
| --- | --- |
| Provider id | `openai` |
| Display name | OpenAI |
| Capabilities | Chat - Speech-to-text - Text-to-speech - Image - Video |
| Default base URL | `https://api.openai.com/v1` |
| Credential type | API key |
| Auth method | HTTP Bearer token |
| Recommended env vars | `OPENAI_API_KEY` |
| API-key link | [OpenAI API keys](https://platform.openai.com/api-keys) |
| Official docs | [OpenAI quickstart](https://developers.openai.com/api/docs/quickstart) |

Default agent models:

| Model id | Display name | Effort support |
| --- | --- | --- |
| `gpt-5.5` | GPT-5.5 | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`; default `medium` |
| `gpt-5.5-pro` | GPT-5.5 Pro | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`; default `medium` |
| `gpt-5.4` | GPT-5.4 | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`; default `medium` |
| `gpt-5.4-pro` | GPT-5.4 Pro | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`; default `medium` |
| `gpt-5.4-mini` | GPT-5.4 Mini | `none`, `low`, `medium`, `high`, `xhigh`; default `medium` |

Runtime notes:

- Uses the native OpenAI Responses adapter.
- Function tools are sent as Responses API tools with `strict: false`.
- Reasoning items are preserved in the transcript as OpenAI reasoning blocks.
- Context overflow errors are normalized into `ContextOverflowError` for one
  compaction retry by the agent loop.

Example:

```json
{
	"message": "Plan the implementation and apply the smallest safe patch.",
	"providerId": "openai",
	"model": "gpt-5.5",
	"effort": "high"
}
```

## Related Docs

- [Provider catalog](index.md)
