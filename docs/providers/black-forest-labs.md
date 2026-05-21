# Black Forest Labs Provider

| Property | Value |
| --- | --- |
| Provider id | `black-forest-labs` |
| Display name | Black Forest Labs |
| Capabilities | Image |
| Default base URL | `https://api.bfl.ai/v1` |
| Credential type | BFL API key |
| Auth method | API key authentication |
| Recommended env vars | `BFL_API_KEY` |
| API-key link | [BFL profile/API auth](https://api.us1.bfl.ai/auth/profile) |
| Official docs | [BFL docs](https://docs.bfl.ai/) |

## Model Type Coverage

Official model references were checked in May 2026. Black Forest Labs may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Image Models | FLUX.2 max/pro/flex/klein plus FLUX.1.1 Pro and related image generation/editing model families. Official references: [BFL quick start](https://docs.bfl.ai/quick_start/introduction), [FLUX.2 overview](https://docs.bfl.ai/flux_2), [FLUX.1.1 pro](https://docs.bfl.ai/flux_models). | Friday exposes the shared `image-provider-coming-soon` placeholder for Black Forest Labs image generation. |

## Image Models

Official references: [BFL quick start](https://docs.bfl.ai/quick_start/introduction), [FLUX.2 overview](https://docs.bfl.ai/flux_2), [FLUX.1.1 pro](https://docs.bfl.ai/flux_models).

Official model families: FLUX.2 max/pro/flex/klein plus FLUX.1.1 Pro and related image generation/editing model families.

Friday status: Friday exposes the shared `image-provider-coming-soon` placeholder for Black Forest Labs image generation.

## Runtime Notes

- Black Forest Labs is present as an image-provider credential and capability
  entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

## Configuration Shape Example

```json
{
	"id": "black-forest-labs",
	"baseUrl": "https://api.bfl.ai/v1",
	"recommendedEnvVar": "BFL_API_KEY"
}
```

## Related Docs

- [Provider catalog](index.md)
