# Midjourney Provider

| Property | Value |
| --- | --- |
| Provider id | `midjourney` |
| Display name | Midjourney |
| Capabilities | Image - Video |
| Default base URL | `https://www.midjourney.com` |
| Credential type | No generally available official API key found |
| Auth method | None configured |
| Recommended env vars | None |
| API-key link | None configured |
| Official docs | [Midjourney help center](https://docs.midjourney.com/hc/en-us) |

## Model Type Coverage

Official model references were checked in May 2026. Midjourney may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Image Models | Midjourney versioned image models such as Version 7, Version 6.1, Version 6, and Niji 6. Official references: [Midjourney versions](https://docs.midjourney.com/docs/models). | Friday exposes the shared `image-provider-coming-soon` placeholder for Midjourney image generation. |
| Video Models | Midjourney image-to-video generation from gallery or uploaded images with video-specific parameters. Official references: [Midjourney video](https://docs.midjourney.com/docs/en/video). | Friday exposes the shared `video-provider-coming-soon` placeholder for Midjourney video generation. |

## Image Models

Official references: [Midjourney versions](https://docs.midjourney.com/docs/models).

Official model families: Midjourney versioned image models such as Version 7, Version 6.1, Version 6, and Niji 6.

Friday status: Friday exposes the shared `image-provider-coming-soon` placeholder for Midjourney image generation.

## Video Models

Official references: [Midjourney video](https://docs.midjourney.com/docs/en/video).

Official model families: Midjourney image-to-video generation from gallery or uploaded images with video-specific parameters.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for Midjourney video generation.

## Runtime Notes

- The constants intentionally do not provide an official public API-key
  management link.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

## Configuration Shape Example

```json
{
	"id": "midjourney",
	"baseUrl": "https://www.midjourney.com",
	"officialApiKeyManagement": false
}
```

## Related Docs

- [Provider catalog](index.md)
