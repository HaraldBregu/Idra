# Adobe Firefly Provider

| Property | Value |
| --- | --- |
| Provider id | `adobe-firefly` |
| Display name | Adobe Firefly |
| Capabilities | Image - Video - Audio |
| Default base URL | `https://firefly-api.adobe.io` |
| Credential type | Adobe Developer API key/client credentials plus access token |
| Auth method | Adobe API key + OAuth access token |
| Recommended env vars | `FIREFLY_SERVICES_CLIENT_ID`, `FIREFLY_SERVICES_CLIENT_SECRET`, `FIREFLY_SERVICES_ACCESS_TOKEN` |
| API-key link | [Adobe Developer Console](https://developer.adobe.com/console) |
| Official docs | [Firefly Services getting started](https://developer.adobe.com/firefly-services/docs/guides/get-started) |

## Model Type Coverage

Official model references were checked in May 2026. Adobe Firefly may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Image Models | Firefly Image Model 5, custom models, generated image upscaling, compositing, and image editing APIs. Official references: [Adobe Firefly API overview](https://developer.adobe.com/firefly-services/docs/firefly-api/), [Generate Image with Image5](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/how-tos/cm-generate-image/feature-guide), [Custom Models](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/custom-models). | Friday exposes the shared `image-provider-coming-soon` placeholder for Adobe Firefly image generation. |
| Video Models | Audio/Video APIs for dynamic graphics rendering, reframing, translate-and-lip-sync, text-to-avatar, and video customization. Official references: [Adobe Audio/Video API overview](https://developer.adobe.com/audio-video-firefly-services/). | Friday exposes the shared `video-provider-coming-soon` placeholder for Adobe Firefly video generation. |
| Audio Models | Text-to-speech, translate-and-lip-sync, and avatar audio/video services. Official references: [Adobe Audio/Video API overview](https://developer.adobe.com/audio-video-firefly-services/). | Friday exposes the shared `music-provider-coming-soon` placeholder for Adobe sound generation. |

## Image Models

Official references: [Adobe Firefly API overview](https://developer.adobe.com/firefly-services/docs/firefly-api/), [Generate Image with Image5](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/how-tos/cm-generate-image/feature-guide), [Custom Models](https://developer.adobe.com/firefly-services/docs/firefly-api/guides/concepts/custom-models).

Official model families: Firefly Image Model 5, custom models, generated image upscaling, compositing, and image editing APIs.

Friday status: Friday exposes the shared `image-provider-coming-soon` placeholder for Adobe Firefly image generation.

## Video Models

Official references: [Adobe Audio/Video API overview](https://developer.adobe.com/audio-video-firefly-services/).

Official model families: Audio/Video APIs for dynamic graphics rendering, reframing, translate-and-lip-sync, text-to-avatar, and video customization.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for Adobe Firefly video generation.

## Audio Models

Official references: [Adobe Audio/Video API overview](https://developer.adobe.com/audio-video-firefly-services/).

Official model families: Text-to-speech, translate-and-lip-sync, and avatar audio/video services.

Friday status: Friday exposes the shared `music-provider-coming-soon` placeholder for Adobe sound generation.

## Runtime Notes

- Firefly Services require Adobe Developer Console credentials and an access
  token; not just a static API key.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

## Configuration Shape Example

```json
{
	"id": "adobe-firefly",
	"baseUrl": "https://firefly-api.adobe.io",
	"recommendedEnvVars": [
		"FIREFLY_SERVICES_CLIENT_ID",
		"FIREFLY_SERVICES_CLIENT_SECRET",
		"FIREFLY_SERVICES_ACCESS_TOKEN"
	]
}
```

## Related Docs

- [Provider catalog](index.md)
