# Kuaishou / Kling AI Provider

| Property | Value |
| --- | --- |
| Provider id | `kling` |
| Display name | Kuaishou / Kling AI |
| Capabilities | Image - Video - Audio |
| Default base URL | `https://kling.ai` |
| Credential type | Access key and secret key |
| Auth method | Kling developer API authentication using access/secret credentials |
| Recommended env vars | `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` |
| API-key link | [Kling API keys](https://app.klingai.com/global/dev/account/apiKey) |
| Official docs | [Kling API overview](https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview) |

## Model Type Coverage

Official model references were checked in May 2026. Kuaishou / Kling AI may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Image Models | Kling image-generation and image-reference surfaces where enabled in the developer API. Official references: [Kling developer docs](https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview). | Friday exposes the shared `image-provider-coming-soon` placeholder for Kling image generation. |
| Video Models | Kling Video 3.0, Video 3.0 Omni, native-audio video, text-to-video, image-to-video, start/end-frame video, and multi-shot video. Official references: [Kling Video 3.0 guide](https://app.klingai.com/cn/quickstart/klingai-video-3-model-user-guide), [Kling developer docs](https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview). | Friday exposes the shared `video-provider-coming-soon` placeholder for Kling video generation. |
| Audio Models | Native audio generation and voice control as part of Kling video models. Official references: [Kling Video 3.0 guide](https://app.klingai.com/cn/quickstart/klingai-video-3-model-user-guide). | Friday exposes the shared `music-provider-coming-soon` placeholder for Kling sound generation. |

## Image Models

Official references: [Kling developer docs](https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview).

Official model families: Kling image-generation and image-reference surfaces where enabled in the developer API.

Friday status: Friday exposes the shared `image-provider-coming-soon` placeholder for Kling image generation.

## Video Models

Official references: [Kling Video 3.0 guide](https://app.klingai.com/cn/quickstart/klingai-video-3-model-user-guide), [Kling developer docs](https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview).

Official model families: Kling Video 3.0, Video 3.0 Omni, native-audio video, text-to-video, image-to-video, start/end-frame video, and multi-shot video.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for Kling video generation.

## Audio Models

Official references: [Kling Video 3.0 guide](https://app.klingai.com/cn/quickstart/klingai-video-3-model-user-guide).

Official model families: Native audio generation and voice control as part of Kling video models.

Friday status: Friday exposes the shared `music-provider-coming-soon` placeholder for Kling sound generation.

## Runtime Notes

- Kling uses access/secret credentials in the configured metadata.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

## Configuration Shape Example

```json
{
	"id": "kling",
	"baseUrl": "https://kling.ai",
	"recommendedEnvVars": ["KLING_ACCESS_KEY", "KLING_SECRET_KEY"]
}
```

## Related Docs

- [Provider catalog](index.md)
