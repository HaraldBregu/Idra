# xAI Provider

| Property | Value |
| --- | --- |
| Provider id | `xai` |
| Display name | xAI |
| Capabilities | Chat - Speech-to-text - Realtime voice - Image - Video |
| Default base URL | `https://api.x.ai/v1` |
| Credential type | API key |
| Auth method | HTTP Bearer token |
| Recommended env vars | `XAI_API_KEY` |
| API-key link | [xAI console](https://console.x.ai/) |
| Official docs | [xAI quickstart](https://docs.x.ai/developers/quickstart) |

## Model Type Coverage

Official model references were checked in May 2026. xAI may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | Grok chat, reasoning, coding, and multimodal model families. Official references: [xAI model docs](https://docs.x.ai/developers/models). | Friday has an explicit default agent catalog for xAI. |
| Speech-To-Text Models | xAI speech-to-text supports REST file transcription and realtime WebSocket transcription. Official references: [xAI speech-to-text docs](https://docs.x.ai/developers/models/speech-to-text). | Friday exposes the shared `speech-to-text-provider-coming-soon` placeholder for xAI STT. |
| Realtime Voice Models | Realtime voice models for interactive audio sessions where enabled by xAI. Official references: [xAI model docs](https://docs.x.ai/developers/models). | Friday has no dedicated realtime-voice catalog yet. |
| Image Models | xAI image generation and multimodal image-capable Grok surfaces where enabled by account access. Official references: [xAI model docs](https://docs.x.ai/developers/models). | Friday exposes the shared `image-provider-coming-soon` placeholder for xAI image generation. |
| Video Models | xAI video or image-to-video surfaces should be verified against the current xAI model docs before adapter work. Official references: [xAI model docs](https://docs.x.ai/developers/models). | Friday exposes the shared `video-provider-coming-soon` placeholder for xAI video generation. |

## Large Language Models

Official references: [xAI model docs](https://docs.x.ai/developers/models).

Official model families: Grok chat, reasoning, coding, and multimodal model families.

Friday status: Friday has an explicit default agent catalog for xAI.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `grok-4.3` | Grok 4.3 |
| `grok-4.3-fast` | Grok 4.3 Fast |
| `grok-code-fast` | Grok Code Fast |

## Speech-To-Text Models

Official references: [xAI speech-to-text docs](https://docs.x.ai/developers/models/speech-to-text).

Official model families: xAI speech-to-text supports REST file transcription and realtime WebSocket transcription.

Friday status: Friday exposes the shared `speech-to-text-provider-coming-soon` placeholder for xAI STT.

Documented provider model ids:

| Model id | Display name | Runtime style |
| --- | --- | --- |
| Not exposed | xAI Speech to Text | REST file transcription and realtime WebSocket transcription |

## Realtime Voice Models

Official references: [xAI model docs](https://docs.x.ai/developers/models).

Official model families: Realtime voice models for interactive audio sessions where enabled by xAI.

Friday status: Friday has no dedicated realtime-voice catalog yet.

## Image Models

Official references: [xAI model docs](https://docs.x.ai/developers/models).

Official model families: xAI image generation and multimodal image-capable Grok surfaces where enabled by account access.

Friday status: Friday exposes the shared `image-provider-coming-soon` placeholder for xAI image generation.

## Video Models

Official references: [xAI model docs](https://docs.x.ai/developers/models).

Official model families: xAI video or image-to-video surfaces should be verified against the current xAI model docs before adapter work.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for xAI video generation.

## Runtime Notes

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Friday does not save or pass reasoning effort for xAI.

## Example

```json
{
	"message": "Explain the failing test and propose a direct fix.",
	"providerId": "xai",
	"model": "grok-code-fast"
}
```

## Related Docs

- [Provider catalog](index.md)
