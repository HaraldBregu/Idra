# Luma AI Provider

| Property | Value |
| --- | --- |
| Provider id | `luma` |
| Display name | Luma AI |
| Capabilities | Omni - Image - Video - 3D |
| Default base URL | `https://api.lumalabs.ai/dream-machine/v1` |
| Credential type | API key |
| Auth method | API key authentication |
| Recommended env vars | `LUMA_API_KEY` |
| API-key link | [Luma API keys](https://lumalabs.ai/dream-machine/api/keys) |
| Official docs | [Luma docs](https://docs.lumalabs.ai/docs/welcome) |

## Model Type Coverage

Official model references were checked in May 2026. Luma AI may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | Luma `uni-1` is represented in Friday as an omni agent model; official Dream Machine API docs focus on image and video generation. Official references: [Luma Dream Machine docs](https://docs.lumalabs.ai/docs/welcome). | Friday has an explicit default agent catalog for Luma. |
| Image Models | Photon 1 and Photon Flash 1 for text-to-image, character reference, image reference, style reference, and image-to-image. Official references: [Luma image generation](https://docs.lumalabs.ai/docs/image-generation), [Luma API docs](https://docs.lumalabs.ai/docs/api). | Friday exposes the shared `image-provider-coming-soon` placeholder for Luma image generation. |
| Video Models | Ray 2 and Ray Flash 2 for text-to-video, image-to-video, keyframes, reframe, loops, and concept controls. Official references: [Luma video generation](https://docs.lumalabs.ai/docs/video-generation), [Luma reframe](https://docs.lumalabs.ai/docs/reframe-video-image). | Friday exposes the shared `video-provider-coming-soon` placeholder for Luma video generation. |
| 3D Models | Luma has broader 3D capture and generation product surfaces outside the documented Dream Machine image/video API. Official references: [Luma Dream Machine docs](https://docs.lumalabs.ai/docs/welcome). | Friday has no 3D runtime catalog yet. |

## Large Language Models

Official references: [Luma Dream Machine docs](https://docs.lumalabs.ai/docs/welcome).

Official model families: Luma `uni-1` is represented in Friday as an omni agent model; official Dream Machine API docs focus on image and video generation.

Friday status: Friday has an explicit default agent catalog for Luma.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `uni-1` | Uni-1 |

## Image Models

Official references: [Luma image generation](https://docs.lumalabs.ai/docs/image-generation), [Luma API docs](https://docs.lumalabs.ai/docs/api).

Official model families: Photon 1 and Photon Flash 1 for text-to-image, character reference, image reference, style reference, and image-to-image.

Friday status: Friday exposes the shared `image-provider-coming-soon` placeholder for Luma image generation.

## Video Models

Official references: [Luma video generation](https://docs.lumalabs.ai/docs/video-generation), [Luma reframe](https://docs.lumalabs.ai/docs/reframe-video-image).

Official model families: Ray 2 and Ray Flash 2 for text-to-video, image-to-video, keyframes, reframe, loops, and concept controls.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for Luma video generation.

## 3D Models

Official references: [Luma Dream Machine docs](https://docs.lumalabs.ai/docs/welcome).

Official model families: Luma has broader 3D capture and generation product surfaces outside the documented Dream Machine image/video API.

Friday status: Friday has no 3D runtime catalog yet.

## Runtime Notes

- Uses the generic OpenAI Chat Completions-compatible adapter if selected for
  the main agent.
- Confirm endpoint compatibility before using Luma as the main agent provider.
- Friday does not save or pass reasoning effort for Luma.

## Example

```json
{
	"message": "Describe a storyboard for this product demo.",
	"providerId": "luma",
	"model": "uni-1"
}
```

## Related Docs

- [Provider catalog](index.md)
