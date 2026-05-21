# Mistral AI Provider

| Property | Value |
| --- | --- |
| Provider id | `mistral` |
| Display name | Mistral AI |
| Capabilities | Chat - Speech-to-text - Text-to-speech |
| Default base URL | `https://api.mistral.ai/v1` |
| Credential type | API key |
| Auth method | HTTP Bearer token |
| Recommended env vars | `MISTRAL_API_KEY` |
| API-key link | [Mistral API keys](https://admin.mistral.ai/organization/api-keys) |
| Official docs | [Mistral quickstarts](https://docs.mistral.ai/getting-started/quickstarts) |

## Model Type Coverage

Official model references were checked in May 2026. Mistral AI may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | Mistral Large, Medium, Small, Ministral, Magistral, Devstral, Voxtral, OCR, and multimodal model families. Official references: [Mistral models](https://docs.mistral.ai/models). | Friday has an explicit default agent catalog for Mistral. |
| Speech-To-Text Models | Voxtral Mini Transcribe V2 for batch transcription and Voxtral realtime transcription models. Official references: [Mistral audio transcription](https://docs.mistral.ai/capabilities/audio_transcription), [Offline transcription](https://docs.mistral.ai/capabilities/audio/speech_to_text/offline_transcription). | Friday exposes the shared `speech-to-text-provider-coming-soon` placeholder for Mistral STT. |
| Text-To-Speech Models | Voxtral TTS, including `voxtral-mini-tts-2603` for speech generation. Official references: [Mistral text to speech](https://docs.mistral.ai/studio-api/audio/text_to_speech), [Speech generation](https://docs.mistral.ai/capabilities/audio/text_to_speech/speech). | Friday exposes the shared `text-to-speech-provider-coming-soon` placeholder for Mistral TTS. |
| OCR Models | OCR 3 and Document AI model surfaces. Official references: [Mistral models](https://docs.mistral.ai/models). | Friday OCR is endpoint-backed today and has no provider-backed Mistral OCR catalog. |
| Embedding Models | Mistral embedding models where exposed by the platform. Official references: [Mistral models](https://docs.mistral.ai/models). | Friday has no default embedding provider catalog yet. |

## Large Language Models

Official references: [Mistral models](https://docs.mistral.ai/models).

Official model families: Mistral Large, Medium, Small, Ministral, Magistral, Devstral, Voxtral, OCR, and multimodal model families.

Friday status: Friday has an explicit default agent catalog for Mistral.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `mistral-large-2512` | Mistral Large 3 |
| `mistral-large-latest` | Mistral Large Latest |
| `mistral-medium-2604` | Mistral Medium 3.5 |
| `mistral-medium-latest` | Mistral Medium Latest |
| `mistral-medium-2508` | Mistral Medium 3.1 |
| `mistral-small-2603` | Mistral Small 4 |
| `mistral-small-latest` | Mistral Small Latest |
| `ministral-14b-2512` | Ministral 3 14B |
| `ministral-14b-latest` | Ministral 3 14B Latest |
| `ministral-8b-2512` | Ministral 3 8B |
| `ministral-8b-latest` | Ministral 3 8B Latest |
| `ministral-3b-2512` | Ministral 3 3B |
| `ministral-3b-latest` | Ministral 3 3B Latest |
| `magistral-medium-2509` | Magistral Medium 1.2 |
| `magistral-medium-latest` | Magistral Medium Latest |

## Speech-To-Text Models

Official references: [Mistral audio transcription](https://docs.mistral.ai/capabilities/audio_transcription), [Offline transcription](https://docs.mistral.ai/capabilities/audio/speech_to_text/offline_transcription).

Official model families: Voxtral Mini Transcribe V2 for batch transcription and Voxtral realtime transcription models.

Friday status: Friday exposes the shared `speech-to-text-provider-coming-soon` placeholder for Mistral STT.

Documented provider model ids:

| Model id | Display name | Runtime style |
| --- | --- | --- |
| `voxtral-mini-latest` | Voxtral Mini Transcribe Latest | Offline/file transcription |
| `voxtral-mini-2602` | Voxtral Mini Transcribe | Offline/file transcription |
| `voxtral-mini-transcribe-realtime-2602` | Voxtral Mini Transcribe Realtime | Realtime transcription |

## Text-To-Speech Models

Official references: [Mistral text to speech](https://docs.mistral.ai/studio-api/audio/text_to_speech), [Speech generation](https://docs.mistral.ai/capabilities/audio/text_to_speech/speech).

Official model families: Voxtral TTS, including `voxtral-mini-tts-2603` for speech generation.

Friday status: Friday exposes the shared `text-to-speech-provider-coming-soon` placeholder for Mistral TTS.

## OCR Models

Official references: [Mistral models](https://docs.mistral.ai/models).

Official model families: OCR 3 and Document AI model surfaces.

Friday status: Friday OCR is endpoint-backed today and has no provider-backed Mistral OCR catalog.

## Embedding Models

Official references: [Mistral models](https://docs.mistral.ai/models).

Official model families: Mistral embedding models where exposed by the platform.

Friday status: Friday has no default embedding provider catalog yet.

## Runtime Notes

- Uses the dedicated Mistral adapter and Mistral SDK chat streaming.
- The adapter normalizes a base URL ending in `/v1` before passing it to the
  SDK.
- Tool calls are streamed with Mistral `toolCalls`.
- Adapter effort mapping exists for `none`, `high`, and `xhigh`, but the main
  agent service currently resolves effort only for OpenAI.

## Example

```json
{
	"message": "Implement the smallest change that satisfies this bug report.",
	"providerId": "mistral",
	"model": "mistral-large-latest"
}
```

## Related Docs

- [Provider catalog](index.md)
