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

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Large Language Models | `glm-5.1`, `glm-5`, `glm-5-turbo` |

## Large Language Models

| Model id | Status |
| --- | --- |
| `glm-5.1` | `active` |
| `glm-5` | `active` |
| `glm-5-turbo` | `active` |

## Related Docs

- [Provider catalog](index.md)
