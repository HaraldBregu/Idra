# Stability AI Provider

| Property | Value |
| --- | --- |
| Provider id | `stability-ai` |
| Display name | Stability AI |
| Capabilities | Image - Video - Audio |
| Default base URL | `https://api.stability.ai/v2beta` |
| Credential type | API key |
| Auth method | `Authorization: Bearer <api_key>` |
| Recommended env vars | `STABILITY_API_KEY` |
| API-key link | [Stability API keys](https://platform.stability.ai/account/keys) |
| Official docs | [Stability getting started](https://platform.stability.ai/docs/getting-started) |

## Model Type Coverage

Official model references were checked in May 2026. Stability AI may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Image Models | Stable Image Ultra, Stable Image Core, Stable Diffusion 3.5 Large, Large Turbo, Medium, Flash, and SDXL image models. Official references: [Stability AI developer platform](https://platform.stability.ai/), [Stable Diffusion 3.5](https://stability.ai/news-updates/stable-diffusion-35-large-is-now-available-on-microsoft-ai-foundry). | Friday exposes the shared `image-provider-coming-soon` placeholder for Stability AI image generation. |
| Video Models | Stable Video Diffusion and related video generation capabilities. Official references: [Stable Video](https://stability.ai/stable-video). | Friday exposes the shared `video-provider-coming-soon` placeholder for Stability AI video generation. |
| Audio Models | Stable Audio 2.5 and related audio generation surfaces. Official references: [Stable Audio 2.5 guide](https://stability.ai/guides/stable-audio-25-prompt-guide), [Stability AI developer platform](https://platform.stability.ai/). | Friday exposes the shared `music-provider-coming-soon` placeholder for Stability AI sound generation. |
| 3D Models | Stable Fast 3D and Stable Point Aware 3D preview surfaces. Official references: [Stability AI developer platform](https://platform.stability.ai/). | Friday has no 3D runtime catalog yet. |

## Image Models

Official references: [Stability AI developer platform](https://platform.stability.ai/), [Stable Diffusion 3.5](https://stability.ai/news-updates/stable-diffusion-35-large-is-now-available-on-microsoft-ai-foundry).

Official model families: Stable Image Ultra, Stable Image Core, Stable Diffusion 3.5 Large, Large Turbo, Medium, Flash, and SDXL image models.

Friday status: Friday exposes the shared `image-provider-coming-soon` placeholder for Stability AI image generation.

## Video Models

Official references: [Stable Video](https://stability.ai/stable-video).

Official model families: Stable Video Diffusion and related video generation capabilities.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for Stability AI video generation.

## Audio Models

Official references: [Stable Audio 2.5 guide](https://stability.ai/guides/stable-audio-25-prompt-guide), [Stability AI developer platform](https://platform.stability.ai/).

Official model families: Stable Audio 2.5 and related audio generation surfaces.

Friday status: Friday exposes the shared `music-provider-coming-soon` placeholder for Stability AI sound generation.

## 3D Models

Official references: [Stability AI developer platform](https://platform.stability.ai/).

Official model families: Stable Fast 3D and Stable Point Aware 3D preview surfaces.

Friday status: Friday has no 3D runtime catalog yet.

## Runtime Notes

- Stability AI is present as an image/video/audio credential and capability
  entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

## Configuration Shape Example

```json
{
	"id": "stability-ai",
	"baseUrl": "https://api.stability.ai/v2beta",
	"recommendedEnvVar": "STABILITY_API_KEY"
}
```

## Related Docs

- [Provider catalog](index.md)
