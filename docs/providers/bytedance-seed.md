# ByteDance Seed Provider

| Property | Value |
| --- | --- |
| Provider id | `bytedance-seed` |
| Display name | ByteDance Seed |
| Capabilities | Chat - Image - Video - 3D |
| Default base URL | `https://ark.cn-beijing.volces.com/api/v3` |
| Credential type | BytePlus ModelArk API key |
| Auth method | API key / Bearer token |
| Recommended env vars | `ARK_API_KEY`, `BYTEPLUS_API_KEY` |
| API-key link | [BytePlus ModelArk API keys](https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey) |
| Official docs | [BytePlus ModelArk docs](https://docs.byteplus.com/en/docs/ModelArk/1399008) |

## Model Type Coverage

Official model references were checked in May 2026. ByteDance Seed may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | Seed language, multimodal thinking, code, and agent-oriented model families. Official references: [BytePlus ModelArk language models](https://docs.byteplus.com/en/docs/modelark/1099504), [Seed 1.6](https://docs.byteplus.com/en/docs/ModelArk/1593702). | Friday has an explicit default agent catalog for ByteDance Seed. |
| Image Models | Seedream image generation and editing model families. Official references: [Seedream 4.0](https://docs.byteplus.com/en/docs/ModelArk/1824718), [Seedream tutorial](https://docs.byteplus.com/en/docs/ModelArk/1824121). | Friday exposes the shared `image-provider-coming-soon` placeholder for ByteDance image generation. |
| Video Models | Seedance video generation model families including text-to-video and image-to-video. Official references: [Seedance pro fast](https://docs.byteplus.com/en/docs/modelark/1901652), [ModelArk pricing](https://docs.byteplus.com/en/docs/ModelArk/1099320). | Friday exposes the shared `video-provider-coming-soon` placeholder for ByteDance video generation. |
| 3D Models | ModelArk may expose 3D-capable media models by region and account access. Official references: [BytePlus ModelArk model list](https://docs.byteplus.com/en/docs/ModelArk/1330310). | Friday has no 3D runtime catalog yet. |

## Large Language Models

Official references: [BytePlus ModelArk language models](https://docs.byteplus.com/en/docs/modelark/1099504), [Seed 1.6](https://docs.byteplus.com/en/docs/ModelArk/1593702).

Official model families: Seed language, multimodal thinking, code, and agent-oriented model families.

Friday status: Friday has an explicit default agent catalog for ByteDance Seed.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `seed2.0-pro` | Seed2.0 Pro |
| `seed2.0-code` | Seed2.0 Code |

## Image Models

Official references: [Seedream 4.0](https://docs.byteplus.com/en/docs/ModelArk/1824718), [Seedream tutorial](https://docs.byteplus.com/en/docs/ModelArk/1824121).

Official model families: Seedream image generation and editing model families.

Friday status: Friday exposes the shared `image-provider-coming-soon` placeholder for ByteDance image generation.

## Video Models

Official references: [Seedance pro fast](https://docs.byteplus.com/en/docs/modelark/1901652), [ModelArk pricing](https://docs.byteplus.com/en/docs/ModelArk/1099320).

Official model families: Seedance video generation model families including text-to-video and image-to-video.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for ByteDance video generation.

## 3D Models

Official references: [BytePlus ModelArk model list](https://docs.byteplus.com/en/docs/ModelArk/1330310).

Official model families: ModelArk may expose 3D-capable media models by region and account access.

Friday status: Friday has no 3D runtime catalog yet.

## Runtime Notes

- Uses the generic OpenAI Chat Completions-compatible adapter.
- The API-key docs note that the relevant ModelArk model service must be
  enabled.
- Friday does not save or pass reasoning effort for ByteDance Seed.

## Example

```json
{
	"message": "Generate a migration checklist for this module.",
	"providerId": "bytedance-seed",
	"model": "seed2.0-code"
}
```

## Related Docs

- [Provider catalog](index.md)
