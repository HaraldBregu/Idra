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

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Ideogram is present as an image-provider credential and capability entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "ideogram",
	"baseUrl": "https://api.ideogram.ai",
	"recommendedEnvVar": "IDEOGRAM_API_KEY"
}
```

## Related Docs

- [Provider catalog](index.md)
