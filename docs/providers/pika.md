# Pika Provider

| Property | Value |
| --- | --- |
| Provider id | `pika` |
| Display name | Pika |
| Capabilities | Video |
| Default base URL | `https://pika.art` |
| Credential type | Fal API key for official Pika API access via Fal; third-party Pika keys also exist |
| Auth method | `FAL_KEY` / API key authentication |
| Recommended env vars | `FAL_KEY`, `PIKA_API_KEY` |
| API-key link | [Fal API keys](https://fal.ai/dashboard/keys) |
| Official docs | [Pika API](https://pika.art/api) |

## Model Type Coverage

Official model references were checked in May 2026. Pika may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Video Models | Pika v2.1, v2.2, v2.5, text-to-video, image-to-video, keyframes, Pikascenes, Pikaffects, PikaSwaps, and related video-editing models exposed through fal. Official references: [Pika API](https://pika.art/api), [Pika on fal](https://fal.ai/models/fal-ai/pika/v2.1/text-to-video/api/), [Pika API announcement](https://blog.fal.ai/pika-api-is-now-powered-by-fal/). | Friday exposes the shared `video-provider-coming-soon` placeholder for Pika video generation. |

## Video Models

Official references: [Pika API](https://pika.art/api), [Pika on fal](https://fal.ai/models/fal-ai/pika/v2.1/text-to-video/api/), [Pika API announcement](https://blog.fal.ai/pika-api-is-now-powered-by-fal/).

Official model families: Pika v2.1, v2.2, v2.5, text-to-video, image-to-video, keyframes, Pikascenes, Pikaffects, PikaSwaps, and related video-editing models exposed through fal.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for Pika video generation.

## Runtime Notes

- The constants point official Pika API access at Fal.ai.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

## Configuration Shape Example

```json
{
	"id": "pika",
	"baseUrl": "https://pika.art",
	"recommendedEnvVars": ["FAL_KEY", "PIKA_API_KEY"]
}
```

## Related Docs

- [Provider catalog](index.md)
