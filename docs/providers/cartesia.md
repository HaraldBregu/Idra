# Cartesia Provider

| Property | Value |
| --- | --- |
| Provider id | `cartesia` |
| Display name | Cartesia |
| Capabilities | Text-to-speech |
| Default base URL | `https://api.cartesia.ai` |
| Credential type | API key; admin API keys for key-management endpoints |
| Auth method | `Authorization: Bearer <api_key>` plus `Cartesia-Version` header |
| Recommended env vars | `CARTESIA_API_KEY` |
| API-key link | [Cartesia keys](https://play.cartesia.ai/keys) |
| Official docs | [Cartesia API conventions](https://docs.cartesia.ai/use-the-api/api-conventions) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Cartesia is present as a provider credential and capability entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "cartesia",
	"baseUrl": "https://api.cartesia.ai",
	"recommendedEnvVar": "CARTESIA_API_KEY"
}
```

## Related Docs

- [Provider catalog](index.md)
