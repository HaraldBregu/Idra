# Pika Provider

| Property | Value |
| --- | --- |
| Provider id | `pika` |
| Display name | Pika |
| Capabilities | Video |
| Default base URL | `https://pika.art` |
| Credential type | Fal API key for official Pika API access via Fal; third-party Pika keys also exist |
| Auth method | `FAL_KEY` / API key authentication |
| Recommended env vars | `FAL_KEY`, `PIKA_API_KEY` |
| API-key link | [Fal API keys](https://fal.ai/dashboard/keys) |
| Official docs | [Pika API](https://pika.art/api) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- The constants point official Pika API access at Fal.ai.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "pika",
	"baseUrl": "https://pika.art",
	"recommendedEnvVars": ["FAL_KEY", "PIKA_API_KEY"]
}
```

## Related Docs

- [Provider catalog](index.md)
