# ElevenLabs Provider

| Property | Value |
| --- | --- |
| Provider id | `elevenlabs` |
| Display name | ElevenLabs |
| Capabilities | Speech-to-text - Text-to-speech - Audio - Music |
| Default base URL | `https://api.elevenlabs.io/v1` |
| Credential type | API key |
| Auth method | `xi-api-key` header |
| Recommended env vars | `ELEVENLABS_API_KEY` |
| API-key link | [ElevenLabs API keys](https://elevenlabs.io/app/settings/api-keys) |
| Official docs | [ElevenLabs authentication docs](https://elevenlabs.io/docs/api-reference/authentication) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Module-specific model constants:

| Model id | Display name | Module |
| --- | --- | --- |
| `rachel-multilingual` | Rachel - multilingual | Text-to-speech |

Runtime notes:

- ElevenLabs is configured as the default text-to-speech provider constant.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "elevenlabs",
	"baseUrl": "https://api.elevenlabs.io/v1",
	"recommendedEnvVar": "ELEVENLABS_API_KEY",
	"textToSpeechModel": "rachel-multilingual"
}
```

## Related Docs

- [Provider catalog](index.md)
