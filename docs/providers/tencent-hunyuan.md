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

Default agent models:

| Model id | Display name |
| --- | --- |
| `hy3-preview` | Hy3 Preview |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Tencent Cloud services often use signed SecretId/SecretKey requests rather
  than a single static API key.
- Friday does not save or pass reasoning effort for Tencent Hunyuan.

Example:

```json
{
	"message": "Create a short implementation outline for this feature.",
	"providerId": "tencent-hunyuan",
	"model": "hy3-preview"
}
```

## Related Docs

- [Provider catalog](index.md)
