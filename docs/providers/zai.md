# Z.ai / Zhipu AI Provider

| Property | Value |
| --- | --- |
| Provider id | `zai` |
| Display name | Z.ai / Zhipu AI |
| Capabilities | Chat |
| Default base URL | `https://api.z.ai/api/paas/v4` |
| Credential type | API key |
| Auth method | API key / Bearer token depending on SDK/API |
| Recommended env vars | `ZHIPUAI_API_KEY`, `ZAI_API_KEY` |
| API-key link | [BigModel API keys](https://open.bigmodel.cn/usercenter/apikeys) |
| Official docs | [BigModel API docs](https://open.bigmodel.cn/dev/api) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `glm-5.1` | GLM-5.1 |
| `glm-5` | GLM-5 |
| `glm-4.6` | GLM-4.6 |
| `glm-4.5v` | GLM-4.5V |
| `glm-z1` | GLM-Z1 |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Friday does not save or pass reasoning effort for Z.ai.

Example:

```json
{
	"message": "Extract risks and assumptions from this project brief.",
	"providerId": "zai",
	"model": "glm-5.1"
}
```

## Related Docs

- [Provider catalog](index.md)
