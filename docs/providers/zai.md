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

## Model Type Coverage

Official model references were checked in May 2026. Z.ai / Zhipu AI may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | GLM-5.1, GLM-5, GLM-4.6, GLM-4.5, GLM-Z1, and GLM agent/coding/reasoning model families. Official references: [GLM-5.1](https://docs.z.ai/guides/llm/glm-5.1), [GLM-4.5](https://docs.z.ai/guides/llm/glm-4.5). | Friday has an explicit default agent catalog for Z.ai. |
| Vision Models | GLM vision-language model variants such as GLM-4.5V or related VLM releases where available. Official references: [Z.ai developer docs](https://docs.z.ai/). | Friday does not have a separate Z.ai vision module catalog. |

## Large Language Models

Official references: [GLM-5.1](https://docs.z.ai/guides/llm/glm-5.1), [GLM-4.5](https://docs.z.ai/guides/llm/glm-4.5).

Official model families: GLM-5.1, GLM-5, GLM-4.6, GLM-4.5, GLM-Z1, and GLM agent/coding/reasoning model families.

Friday status: Friday has an explicit default agent catalog for Z.ai.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `glm-5.1` | GLM-5.1 |
| `glm-5` | GLM-5 |
| `glm-4.6` | GLM-4.6 |
| `glm-4.5v` | GLM-4.5V |
| `glm-z1` | GLM-Z1 |

## Vision Models

Official references: [Z.ai developer docs](https://docs.z.ai/).

Official model families: GLM vision-language model variants such as GLM-4.5V or related VLM releases where available.

Friday status: Friday does not have a separate Z.ai vision module catalog.

## Runtime Notes

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Friday does not save or pass reasoning effort for Z.ai.

## Example

```json
{
	"message": "Extract risks and assumptions from this project brief.",
	"providerId": "zai",
	"model": "glm-5.1"
}
```

## Related Docs

- [Provider catalog](index.md)
