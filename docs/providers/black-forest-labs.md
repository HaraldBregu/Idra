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

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Black Forest Labs is present as an image-provider credential and capability
  entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "black-forest-labs",
	"baseUrl": "https://api.bfl.ai/v1",
	"recommendedEnvVar": "BFL_API_KEY"
}
```

## Related Docs

- [Provider catalog](index.md)
