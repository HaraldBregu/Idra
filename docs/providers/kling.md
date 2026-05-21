# Kuaishou / Kling AI Provider

| Property | Value |
| --- | --- |
| Provider id | `kling` |
| Display name | Kuaishou / Kling AI |
| Capabilities | Image - Video - Audio |
| Default base URL | `https://kling.ai` |
| Credential type | Access key and secret key |
| Auth method | Kling developer API authentication using access/secret credentials |
| Recommended env vars | `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` |
| API-key link | [Kling API keys](https://app.klingai.com/global/dev/account/apiKey) |
| Official docs | [Kling API overview](https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Kling uses access/secret credentials in the configured metadata.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "kling",
	"baseUrl": "https://kling.ai",
	"recommendedEnvVars": ["KLING_ACCESS_KEY", "KLING_SECRET_KEY"]
}
```

## Related Docs

- [Provider catalog](index.md)
