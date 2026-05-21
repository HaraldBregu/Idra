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

## Model Type Coverage

Official model references were checked in May 2026. Google DeepMind / Google may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | Gemini Pro, Flash, Flash-Lite, preview, latest, and experimental Gemini model variants with multimodal input. Official references: [Gemini models](https://ai.google.dev/gemini-api/docs/models). | Friday has an explicit default agent catalog for Google. |
| Speech-To-Text Models | Cloud Speech-to-Text Chirp, Chirp 2, Chirp 3, telephony, and domain speech model families. Official references: [Chirp speech-to-text](https://cloud.google.com/speech-to-text/v2/docs/chirp-model). | Friday exposes the shared `speech-to-text-provider-coming-soon` placeholder for Google STT. |
| Text-To-Speech Models | Cloud Text-to-Speech Chirp 3 HD voices, Instant Custom Voice, and other Google Cloud TTS voices. Official references: [Chirp 3 HD voices](https://cloud.google.com/text-to-speech/docs/chirp3-hd), [Instant Custom Voice](https://cloud.google.com/text-to-speech/docs/chirp3-instant-custom-voice). | Friday exposes the shared `text-to-speech-provider-coming-soon` placeholder for Google TTS. |
| Image Models | Gemini image-capable models and Google image generation services such as Imagen where enabled by the selected Google API surface. Official references: [Gemini models](https://ai.google.dev/gemini-api/docs/models). | Friday exposes the shared `image-provider-coming-soon` placeholder for Google image generation. |
| Video Models | Gemini video-input understanding plus Google video generation services such as Veo where enabled by the selected API surface. Official references: [Gemini models](https://ai.google.dev/gemini-api/docs/models). | Friday exposes the shared `video-provider-coming-soon` placeholder for Google video generation. |
| Music And Audio Models | Google audio generation, live audio, and music model surfaces vary by API and region. Official references: [Gemini models](https://ai.google.dev/gemini-api/docs/models). | Friday exposes the shared `music-provider-coming-soon` placeholder for Google sound generation. |
| Embedding Models | Gemini embedding and semantic retrieval model families where exposed by the Gemini API. Official references: [Gemini models](https://ai.google.dev/gemini-api/docs/models). | Friday has no default embedding provider catalog yet. |

## Large Language Models

Official references: [Gemini models](https://ai.google.dev/gemini-api/docs/models).

Official model families: Gemini Pro, Flash, Flash-Lite, preview, latest, and experimental Gemini model variants with multimodal input.

Friday status: Friday has an explicit default agent catalog for Google.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `gemini-3.1-pro-preview` | Gemini 3.1 Pro Preview |
| `gemini-3-flash-preview` | Gemini 3 Flash Preview |
| `gemini-2.5-pro` | Gemini 2.5 Pro |
| `gemini-2.5-flash` | Gemini 2.5 Flash |
| `gemini-2.5-flash-lite` | Gemini 2.5 Flash-Lite |

## Speech-To-Text Models

Official references: [Chirp speech-to-text](https://cloud.google.com/speech-to-text/v2/docs/chirp-model).

Official model families: Cloud Speech-to-Text Chirp, Chirp 2, Chirp 3, telephony, and domain speech model families.

Friday status: Friday exposes the shared `speech-to-text-provider-coming-soon` placeholder for Google STT.

Documented provider model ids:

| Model id | Display name | Runtime style |
| --- | --- | --- |
| `chirp_3` | Chirp 3 | Cloud Speech-to-Text V2 streaming or batch |
| `chirp_2` | Chirp 2 | Cloud Speech-to-Text V2 streaming or batch |
| `telephony` | Telephony | Cloud Speech-to-Text V2 phone-call transcription |

## Text-To-Speech Models

Official references: [Chirp 3 HD voices](https://cloud.google.com/text-to-speech/docs/chirp3-hd), [Instant Custom Voice](https://cloud.google.com/text-to-speech/docs/chirp3-instant-custom-voice).

Official model families: Cloud Text-to-Speech Chirp 3 HD voices, Instant Custom Voice, and other Google Cloud TTS voices.

Friday status: Friday exposes the shared `text-to-speech-provider-coming-soon` placeholder for Google TTS.

## Image Models

Official references: [Gemini models](https://ai.google.dev/gemini-api/docs/models).

Official model families: Gemini image-capable models and Google image generation services such as Imagen where enabled by the selected Google API surface.

Friday status: Friday exposes the shared `image-provider-coming-soon` placeholder for Google image generation.

## Video Models

Official references: [Gemini models](https://ai.google.dev/gemini-api/docs/models).

Official model families: Gemini video-input understanding plus Google video generation services such as Veo where enabled by the selected API surface.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for Google video generation.

## Music And Audio Models

Official references: [Gemini models](https://ai.google.dev/gemini-api/docs/models).

Official model families: Google audio generation, live audio, and music model surfaces vary by API and region.

Friday status: Friday exposes the shared `music-provider-coming-soon` placeholder for Google sound generation.

## Embedding Models

Official references: [Gemini models](https://ai.google.dev/gemini-api/docs/models).

Official model families: Gemini embedding and semantic retrieval model families where exposed by the Gemini API.

Friday status: Friday has no default embedding provider catalog yet.

## Runtime Notes

- Uses the generic OpenAI Chat Completions-compatible adapter.
- The configured base URL points at Google's OpenAI-compatible Gemini endpoint.
- Friday does not save or pass reasoning effort for Google.

## Example

```json
{
	"message": "Compare these two design alternatives.",
	"providerId": "google",
	"model": "gemini-2.5-pro"
}
```

## Related Docs

- [Provider catalog](index.md)
