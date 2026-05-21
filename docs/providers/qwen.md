# Alibaba / Qwen / Wan Provider

| Property | Value |
| --- | --- |
| Provider id | `qwen` |
| Display name | Alibaba / Qwen / Wan |
| Capabilities | Chat - Speech-to-text - Realtime voice/omni - Image - Video |
| Default base URL | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Credential type | Model Studio API key |
| Auth method | API key; OpenAI-compatible or DashScope SDK depending on endpoint |
| Recommended env vars | `DASHSCOPE_API_KEY`, `ALIBABA_CLOUD_API_KEY` |
| API-key link | [Alibaba Model Studio API keys](https://bailian.console.aliyun.com/?tab=api#/api-key) |
| Official docs | [Alibaba Model Studio API key docs](https://www.alibabacloud.com/help/en/model-studio/get-api-key) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Large Language Models | `qwen3.7-max`, `qwen3.6-plus`, `qwen3.6-flash` |
| Speech-To-Text Models | `qwen3.5-omni`, `qwen3-omni-flash` |
| Realtime Voice And Omni Models | `qwen-omni-realtime`, `qwen3.5-omni`, `qwen3-omni-flash` |
| Image Models | `qwen-image`, `qwen-image-edit` |
| Video Models | `wan2.7-t2v`, `wan2.7-i2v`, `wan2.7-video-edit` |

## Large Language Models

| Model id | Status |
| --- | --- |
| `qwen3.7-max` | `active` |
| `qwen3.6-plus` | `active` |
| `qwen3.6-flash` | `active` |

## Speech-To-Text Models

| Model id | Status |
| --- | --- |
| `qwen3.5-omni` | `active` |
| `qwen3-omni-flash` | `active` |

## Realtime Voice And Omni Models

| Model id | Status |
| --- | --- |
| `qwen-omni-realtime` | `active` |
| `qwen3.5-omni` | `active` |
| `qwen3-omni-flash` | `active` |

## Image Models

| Model id | Status |
| --- | --- |
| `qwen-image` | `active` |
| `qwen-image-edit` | `active` |

## Video Models

| Model id | Status |
| --- | --- |
| `wan2.7-t2v` | `active` |
| `wan2.7-i2v` | `active` |
| `wan2.7-video-edit` | `active` |

## Related Docs

- [Provider catalog](index.md)
