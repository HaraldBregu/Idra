# Runway Provider

| Property | Value |
| --- | --- |
| Provider id | `runway` |
| Display name | Runway |
| Capabilities | Video |
| Default base URL | `https://api.dev.runwayml.com/v1` |
| Credential type | API key |
| Auth method | API key authentication |
| Recommended env vars | `RUNWAYML_API_SECRET`, `RUNWAY_API_KEY` |
| API-key link | [Runway developer portal](https://dev.runwayml.com/) |
| Official docs | [Runway API setup](https://docs.dev.runwayml.com/guides/setup/) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Runway is present as a video-provider credential and capability entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "runway",
	"baseUrl": "https://api.dev.runwayml.com/v1",
	"recommendedEnvVars": ["RUNWAYML_API_SECRET", "RUNWAY_API_KEY"]
}
```

## Related Docs

- [Provider catalog](index.md)
