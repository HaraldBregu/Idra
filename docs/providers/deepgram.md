# Deepgram Provider

| Property | Value |
| --- | --- |
| Provider id | `deepgram` |
| Display name | Deepgram |
| Capabilities | Speech-to-text - Text-to-speech |
| Default base URL | `https://api.deepgram.com/v1` |
| Credential type | API key |
| Auth method | Token/API key auth |
| Recommended env vars | `DEEPGRAM_API_KEY` |
| API-key link | [Deepgram project keys](https://console.deepgram.com/project/keys) |
| Official docs | [Deepgram API key docs](https://developers.deepgram.com/docs/create-additional-api-keys) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Deepgram is present as a provider credential and capability entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "deepgram",
	"baseUrl": "https://api.deepgram.com/v1",
	"recommendedEnvVar": "DEEPGRAM_API_KEY"
}
```

## Related Docs

- [Provider catalog](index.md)
