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

## Model Type Coverage

Official model references were checked in May 2026. Alibaba / Qwen / Wan may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | Qwen-Max, Qwen-Plus, Qwen-Flash, Qwen-Coder, QwQ, Qwen open models, and domain-specific text models. Official references: [Alibaba Model Studio model list](https://www.alibabacloud.com/help/en/model-studio/user-guide/model/). | Friday has an explicit default agent catalog for Qwen. |
| Speech-To-Text Models | Qwen realtime speech recognition, Qwen file recognition, Fun-ASR, Paraformer, and Qwen live-translation models. Official references: [Alibaba Model Studio model list](https://www.alibabacloud.com/help/en/model-studio/user-guide/model/), [Speech-to-speech models](https://www.alibabacloud.com/help/en/model-studio/speech-to-speech/). | Friday exposes the shared `speech-to-text-provider-coming-soon` placeholder for Qwen STT. |
| Text-To-Speech Models | Qwen speech synthesis, realtime speech synthesis, and CosyVoice model families. Official references: [Alibaba Model Studio model list](https://www.alibabacloud.com/help/en/model-studio/user-guide/model/). | Friday does not currently list Qwen in the TTS provider catalog. |
| Omni Models | Qwen3.5-Omni, Qwen3-Omni, and Qwen3-LiveTranslate families for text, audio, image, and video input. Official references: [Qwen-Omni](https://www.alibabacloud.com/help/en/model-studio/qwen-omni), [Speech-to-speech models](https://www.alibabacloud.com/help/en/model-studio/speech-to-speech/). | Friday has no separate omni module catalog; Qwen omni entries are documented under provider capabilities. |
| Image Models | Wan image, Qwen Image, and Z-Image model families, including text-to-image and image editing. Official references: [Alibaba image generation models](https://www.alibabacloud.com/help/en/model-studio/image-model). | Friday exposes the shared `image-provider-coming-soon` placeholder for Qwen image generation. |
| Video Models | Wan text-to-video, image-to-video, video editing, and audio/video generation families. Official references: [Alibaba Model Studio model list](https://www.alibabacloud.com/help/en/model-studio/user-guide/model/). | Friday exposes the shared `video-provider-coming-soon` placeholder for Qwen video generation. |

## Large Language Models

Official references: [Alibaba Model Studio model list](https://www.alibabacloud.com/help/en/model-studio/user-guide/model/).

Official model families: Qwen-Max, Qwen-Plus, Qwen-Flash, Qwen-Coder, QwQ, Qwen open models, and domain-specific text models.

Friday status: Friday has an explicit default agent catalog for Qwen.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `qwen3-max` | Qwen3-Max |
| `qwen3.5-plus` | Qwen3.5-Plus |
| `qwen3.5-flash` | Qwen3.5-Flash |
| `qwen3-coder-plus` | Qwen3-Coder-Plus |
| `qwq-plus` | QwQ-Plus |

## Speech-To-Text Models

Official references: [Alibaba Model Studio model list](https://www.alibabacloud.com/help/en/model-studio/user-guide/model/), [Speech-to-speech models](https://www.alibabacloud.com/help/en/model-studio/speech-to-speech/).

Official model families: Qwen realtime speech recognition, Qwen file recognition, Fun-ASR, Paraformer, and Qwen live-translation models.

Friday status: Friday exposes the shared `speech-to-text-provider-coming-soon` placeholder for Qwen STT.

Documented provider model ids:

| Model id | Display name | Runtime style |
| --- | --- | --- |
| `fun-asr-realtime` | Fun-ASR Realtime | Realtime transcription |
| `qwen3-asr-flash-realtime` | Qwen3-ASR Flash Realtime | Realtime transcription |
| `qwen3.5-omni-plus-realtime` | Qwen3.5-Omni Plus Realtime | Realtime transcription |
| `fun-asr` | Fun-ASR | File transcription |
| `qwen3-asr-flash-filetrans` | Qwen3-ASR Flash File Transcription | File transcription |
| `qwen3.5-omni-plus` | Qwen3.5-Omni Plus | File transcription |
| `qwen3.5-omni-flash` | Qwen3.5-Omni Flash | File transcription |

## Text-To-Speech Models

Official references: [Alibaba Model Studio model list](https://www.alibabacloud.com/help/en/model-studio/user-guide/model/).

Official model families: Qwen speech synthesis, realtime speech synthesis, and CosyVoice model families.

Friday status: Friday does not currently list Qwen in the TTS provider catalog.

## Omni Models

Official references: [Qwen-Omni](https://www.alibabacloud.com/help/en/model-studio/qwen-omni), [Speech-to-speech models](https://www.alibabacloud.com/help/en/model-studio/speech-to-speech/).

Official model families: Qwen3.5-Omni, Qwen3-Omni, and Qwen3-LiveTranslate families for text, audio, image, and video input.

Friday status: Friday has no separate omni module catalog; Qwen omni entries are documented under provider capabilities.

## Image Models

Official references: [Alibaba image generation models](https://www.alibabacloud.com/help/en/model-studio/image-model).

Official model families: Wan image, Qwen Image, and Z-Image model families, including text-to-image and image editing.

Friday status: Friday exposes the shared `image-provider-coming-soon` placeholder for Qwen image generation.

## Video Models

Official references: [Alibaba Model Studio model list](https://www.alibabacloud.com/help/en/model-studio/user-guide/model/).

Official model families: Wan text-to-video, image-to-video, video editing, and audio/video generation families.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for Qwen video generation.

## Runtime Notes

- Uses the dedicated Qwen adapter, which extends the OpenAI
  Chat Completions-compatible adapter.
- The adapter defaults to DashScope international compatible mode.
- Friday does not save or pass reasoning effort for Qwen.

## Example

```json
{
	"message": "Refactor this parser without changing its public behavior.",
	"providerId": "qwen",
	"model": "qwen3-coder-plus"
}
```

## Related Docs

- [Provider catalog](index.md)
