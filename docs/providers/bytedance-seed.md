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

Default agent models:

| Model id | Display name |
| --- | --- |
| `seed2.0-pro` | Seed2.0 Pro |
| `seed2.0-code` | Seed2.0 Code |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- The API-key docs note that the relevant ModelArk model service must be
  enabled.
- Friday does not save or pass reasoning effort for ByteDance Seed.

Example:

```json
{
	"message": "Generate a migration checklist for this module.",
	"providerId": "bytedance-seed",
	"model": "seed2.0-code"
}
```

## Related Docs

- [Provider catalog](index.md)
