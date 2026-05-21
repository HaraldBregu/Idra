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

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Stability AI is present as an image/video/audio credential and capability
  entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "stability-ai",
	"baseUrl": "https://api.stability.ai/v2beta",
	"recommendedEnvVar": "STABILITY_API_KEY"
}
```

## Related Docs

- [Provider catalog](index.md)
