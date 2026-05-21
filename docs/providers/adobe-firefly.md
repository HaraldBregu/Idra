# Adobe Firefly Provider

| Property | Value |
| --- | --- |
| Provider id | `adobe-firefly` |
| Display name | Adobe Firefly |
| Capabilities | Image - Video - Audio |
| Default base URL | `https://firefly-api.adobe.io` |
| Credential type | Adobe Developer API key/client credentials plus access token |
| Auth method | Adobe API key + OAuth access token |
| Recommended env vars | `FIREFLY_SERVICES_CLIENT_ID`, `FIREFLY_SERVICES_CLIENT_SECRET`, `FIREFLY_SERVICES_ACCESS_TOKEN` |
| API-key link | [Adobe Developer Console](https://developer.adobe.com/console) |
| Official docs | [Firefly Services getting started](https://developer.adobe.com/firefly-services/docs/guides/get-started) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Firefly Services require Adobe Developer Console credentials and an access
  token; not just a static API key.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "adobe-firefly",
	"baseUrl": "https://firefly-api.adobe.io",
	"recommendedEnvVars": [
		"FIREFLY_SERVICES_CLIENT_ID",
		"FIREFLY_SERVICES_CLIENT_SECRET",
		"FIREFLY_SERVICES_ACCESS_TOKEN"
	]
}
```

## Related Docs

- [Provider catalog](index.md)
