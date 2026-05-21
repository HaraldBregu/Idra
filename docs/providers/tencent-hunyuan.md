# Tencent Hunyuan Provider

| Property | Value |
| --- | --- |
| Provider id | `tencent-hunyuan` |
| Display name | Tencent Hunyuan |
| Capabilities | Chat - Image - Video - 3D |
| Default base URL | `https://hunyuan.tencent.com` |
| Credential type | Tencent Cloud SecretId/SecretKey or Hunyuan API key |
| Auth method | Tencent Cloud API 3.0 signature or Hunyuan API key depending on endpoint |
| Recommended env vars | `TENCENTCLOUD_SECRET_ID`, `TENCENTCLOUD_SECRET_KEY`, `HUNYUAN_API_KEY` |
| API-key link | [Tencent Cloud API keys](https://console.cloud.tencent.com/cam/capi) |
| Official docs | [Tencent Hunyuan docs](https://intl.cloud.tencent.com/ind/document/product/1290/79463) |

## Model Type Coverage

Official model references were checked in May 2026. Tencent Hunyuan may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | Tencent HY/Hunyuan text-generation and translation model families. Official references: [Tencent Hunyuan API gateway docs](https://intl.cloud.tencent.com/document/product/1290/79463), [Tencent HY product overview](https://intl.cloud.tencent.com/pt/document/product/1284/75277). | Friday has an explicit default agent catalog for Tencent Hunyuan. |
| Image Models | Tencent Image Creation Large Model services where enabled on Tencent Cloud. Official references: [Tencent Cloud product docs](https://intl.cloud.tencent.com/document/product?lang=en). | Friday exposes the shared `image-provider-coming-soon` placeholder for Tencent image generation. |
| Video Models | Tencent HY multimodal and media-generation surfaces should be verified against current Tencent product docs before adapter work. Official references: [Tencent HY product overview](https://intl.cloud.tencent.com/pt/document/product/1284/75277). | Friday exposes the shared `video-provider-coming-soon` placeholder for Tencent video generation. |
| 3D Models | Tencent HY 3D Global model and API services for 3D generation and processing. Official references: [Tencent HY 3D API documentation](https://intl.cloud.tencent.com/document/product/1284/74915), [Tencent Hunyuan 3D FAQ](https://intl.cloud.tencent.com/document/product/1284/75301). | Friday has no 3D runtime catalog yet. |

## Large Language Models

Official references: [Tencent Hunyuan API gateway docs](https://intl.cloud.tencent.com/document/product/1290/79463), [Tencent HY product overview](https://intl.cloud.tencent.com/pt/document/product/1284/75277).

Official model families: Tencent HY/Hunyuan text-generation and translation model families.

Friday status: Friday has an explicit default agent catalog for Tencent Hunyuan.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `hy3-preview` | Hy3 Preview |

## Image Models

Official references: [Tencent Cloud product docs](https://intl.cloud.tencent.com/document/product?lang=en).

Official model families: Tencent Image Creation Large Model services where enabled on Tencent Cloud.

Friday status: Friday exposes the shared `image-provider-coming-soon` placeholder for Tencent image generation.

## Video Models

Official references: [Tencent HY product overview](https://intl.cloud.tencent.com/pt/document/product/1284/75277).

Official model families: Tencent HY multimodal and media-generation surfaces should be verified against current Tencent product docs before adapter work.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for Tencent video generation.

## 3D Models

Official references: [Tencent HY 3D API documentation](https://intl.cloud.tencent.com/document/product/1284/74915), [Tencent Hunyuan 3D FAQ](https://intl.cloud.tencent.com/document/product/1284/75301).

Official model families: Tencent HY 3D Global model and API services for 3D generation and processing.

Friday status: Friday has no 3D runtime catalog yet.

## Runtime Notes

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Tencent Cloud services often use signed SecretId/SecretKey requests rather
  than a single static API key.
- Friday does not save or pass reasoning effort for Tencent Hunyuan.

## Example

```json
{
	"message": "Create a short implementation outline for this feature.",
	"providerId": "tencent-hunyuan",
	"model": "hy3-preview"
}
```

## Related Docs

- [Provider catalog](index.md)
