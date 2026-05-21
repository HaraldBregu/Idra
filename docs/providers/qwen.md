# Alibaba / Qwen / Wan Provider

| Property | Value |
| --- | --- |
| Provider id | `qwen` |
| Display name | Alibaba / Qwen / Wan |
| Capabilities | Chat - Speech-to-text - Omni - Image - Video |
| Default base URL | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Credential type | Model Studio API key |
| Auth method | API key; OpenAI-compatible or DashScope SDK depending on endpoint |
| Recommended env vars | `DASHSCOPE_API_KEY`, `ALIBABA_CLOUD_API_KEY` |
| API-key link | [Alibaba Model Studio API keys](https://bailian.console.aliyun.com/?tab=api#/api-key) |
| Official docs | [Alibaba Model Studio API key docs](https://www.alibabacloud.com/help/en/model-studio/get-api-key) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `qwen3-max` | Qwen3-Max |
| `qwen3.5-plus` | Qwen3.5-Plus |
| `qwen3.5-flash` | Qwen3.5-Flash |
| `qwen3-coder-plus` | Qwen3-Coder-Plus |
| `qwq-plus` | QwQ-Plus |

Speech-to-text models:

| Model id | Display name | Runtime style |
| --- | --- | --- |
| `fun-asr-realtime` | Fun-ASR Realtime | Realtime transcription |
| `qwen3-asr-flash-realtime` | Qwen3-ASR Flash Realtime | Realtime transcription |
| `qwen3.5-omni-plus-realtime` | Qwen3.5-Omni Plus Realtime | Realtime transcription |
| `fun-asr` | Fun-ASR | File transcription |
| `qwen3-asr-flash-filetrans` | Qwen3-ASR Flash File Transcription | File transcription |
| `qwen3.5-omni-plus` | Qwen3.5-Omni Plus | File transcription |
| `qwen3.5-omni-flash` | Qwen3.5-Omni Flash | File transcription |

Runtime notes:

- Uses the dedicated Qwen adapter, which extends the OpenAI
  Chat Completions-compatible adapter.
- The adapter defaults to DashScope international compatible mode.
- Friday does not save or pass reasoning effort for Qwen.

Example:

```json
{
	"message": "Refactor this parser without changing its public behavior.",
	"providerId": "qwen",
	"model": "qwen3-coder-plus"
}
```

## Related Docs

- [Provider catalog](index.md)
