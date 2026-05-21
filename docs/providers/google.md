# Google DeepMind / Google Provider

| Property | Value |
| --- | --- |
| Provider id | `google` |
| Display name | Google DeepMind / Google |
| Capabilities | Chat - Speech-to-text - Text-to-speech - Image - Video - Music |
| Default base URL | `https://generativelanguage.googleapis.com/v1beta/openai` |
| Credential type | Gemini API key / Google Cloud credentials depending on service |
| Auth method | API key parameter/header for Gemini Developer API; Google Cloud IAM/auth for Vertex/Cloud APIs |
| Recommended env vars | `GEMINI_API_KEY`, `GOOGLE_API_KEY` |
| API-key link | [Google AI Studio API keys](https://aistudio.google.com/app/apikey) |
| Official docs | [Gemini API key docs](https://ai.google.dev/gemini-api/docs/api-key) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `gemini-3.1-pro-preview` | Gemini 3.1 Pro Preview |
| `gemini-3-flash-preview` | Gemini 3 Flash Preview |
| `gemini-2.5-pro` | Gemini 2.5 Pro |
| `gemini-2.5-flash` | Gemini 2.5 Flash |
| `gemini-2.5-flash-lite` | Gemini 2.5 Flash-Lite |

Speech-to-text models:

| Model id | Display name | Runtime style |
| --- | --- | --- |
| `chirp_3` | Chirp 3 | Cloud Speech-to-Text V2 streaming or batch |
| `chirp_2` | Chirp 2 | Cloud Speech-to-Text V2 streaming or batch |
| `telephony` | Telephony | Cloud Speech-to-Text V2 phone-call transcription |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- The configured base URL points at Google's OpenAI-compatible Gemini endpoint.
- Friday does not save or pass reasoning effort for Google.

Example:

```json
{
	"message": "Compare these two design alternatives.",
	"providerId": "google",
	"model": "gemini-2.5-pro"
}
```

## Related Docs

- [Provider catalog](index.md)
