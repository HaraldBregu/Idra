# Ideogram Provider

| Property | Value |
| --- | --- |
| Provider id | `ideogram` |
| Display name | Ideogram |
| Capabilities | Image |
| Default base URL | `https://api.ideogram.ai` |
| Credential type | API key |
| Auth method | API key authentication |
| Recommended env vars | `IDEOGRAM_API_KEY` |
| API-key link | [Ideogram Manage API](https://ideogram.ai/manage-api) |
| Official docs | [Ideogram API setup](https://developer.ideogram.ai/ideogram-api/api-setup) |

## Model Type Coverage

Official model references were checked in May 2026. Ideogram may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Image Models | Ideogram 3.0, legacy V_2/V_3 image models, describe, generate, remix, edit, reframe, replace-background, transparent-background, and custom-model training. Official references: [Ideogram API overview](https://developer.ideogram.ai/), [Generate with Ideogram 3.0](https://developer.ideogram.ai/api-reference), [Custom Model Training](https://developer.ideogram.ai/ideogram-api/custom-model-training). | Friday exposes the shared `image-provider-coming-soon` placeholder for Ideogram image generation. |

## Image Models

Official references: [Ideogram API overview](https://developer.ideogram.ai/), [Generate with Ideogram 3.0](https://developer.ideogram.ai/api-reference), [Custom Model Training](https://developer.ideogram.ai/ideogram-api/custom-model-training).

Official model families: Ideogram 3.0, legacy V_2/V_3 image models, describe, generate, remix, edit, reframe, replace-background, transparent-background, and custom-model training.

Friday status: Friday exposes the shared `image-provider-coming-soon` placeholder for Ideogram image generation.

## Runtime Notes

- Ideogram is present as an image-provider credential and capability entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

## Configuration Shape Example

```json
{
	"id": "ideogram",
	"baseUrl": "https://api.ideogram.ai",
	"recommendedEnvVar": "IDEOGRAM_API_KEY"
}
```

## Related Docs

- [Provider catalog](index.md)
