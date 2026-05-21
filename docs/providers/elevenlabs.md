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

## Model Type Coverage

Official model references were checked in May 2026. ElevenLabs may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Speech-To-Text Models | Scribe v2 and Scribe v2 Realtime automatic speech recognition models. Official references: [ElevenLabs models](https://elevenlabs.io/docs/models/), [ElevenLabs transcription](https://elevenlabs.io/docs/capabilities/speech-to-text/). | Friday exposes the shared `speech-to-text-provider-coming-soon` placeholder for ElevenLabs STT. |
| Text-To-Speech Models | Eleven v3, Eleven Multilingual v2, Eleven Flash v2.5, Eleven Turbo v2.5, voice design, dialogue, and voice-cloning model families. Official references: [ElevenLabs models](https://elevenlabs.io/docs/models/), [Text to Speech](https://elevenlabs.io/docs/overview/capabilities/text-to-speech), [Create speech API](https://elevenlabs.io/docs/api-reference/text-to-speech). | Friday has the concrete `rachel-multilingual` module constant plus the provider-level TTS catalog. |
| Speech-To-Speech And Audio Models | Speech-to-speech, voice changer, dubbing, isolation, and related audio model families. Official references: [ElevenLabs models](https://elevenlabs.io/docs/overview/models). | Friday has no dedicated speech-to-speech catalog yet. |
| Music Models | Eleven Music / `music_v1` for studio-grade music generation. Official references: [ElevenLabs models](https://elevenlabs.io/docs/models/). | Friday exposes the shared `music-provider-coming-soon` placeholder for ElevenLabs music generation. |

## Speech-To-Text Models

Official references: [ElevenLabs models](https://elevenlabs.io/docs/models/), [ElevenLabs transcription](https://elevenlabs.io/docs/capabilities/speech-to-text/).

Official model families: Scribe v2 and Scribe v2 Realtime automatic speech recognition models.

Friday status: Friday exposes the shared `speech-to-text-provider-coming-soon` placeholder for ElevenLabs STT.

Documented provider model ids:

| Model id | Display name | Runtime style |
| --- | --- | --- |
| `scribe_v2` | Scribe v2 | File transcription |
| `scribe_v2_realtime` | Scribe v2 Realtime | Realtime transcription |

## Text-To-Speech Models

Official references: [ElevenLabs models](https://elevenlabs.io/docs/models/), [Text to Speech](https://elevenlabs.io/docs/overview/capabilities/text-to-speech), [Create speech API](https://elevenlabs.io/docs/api-reference/text-to-speech).

Official model families: Eleven v3, Eleven Multilingual v2, Eleven Flash v2.5, Eleven Turbo v2.5, voice design, dialogue, and voice-cloning model families.

Friday status: Friday has the concrete `rachel-multilingual` module constant plus the provider-level TTS catalog.

Friday module constants:

| Model id | Display name | Module |
| --- | --- | --- |
| `rachel-multilingual` | Rachel - multilingual | Text-to-speech |

## Speech-To-Speech And Audio Models

Official references: [ElevenLabs models](https://elevenlabs.io/docs/overview/models).

Official model families: Speech-to-speech, voice changer, dubbing, isolation, and related audio model families.

Friday status: Friday has no dedicated speech-to-speech catalog yet.

## Music Models

Official references: [ElevenLabs models](https://elevenlabs.io/docs/models/).

Official model families: Eleven Music / `music_v1` for studio-grade music generation.

Friday status: Friday exposes the shared `music-provider-coming-soon` placeholder for ElevenLabs music generation.

## Runtime Notes

- ElevenLabs is configured as the default text-to-speech provider constant.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

## Configuration Shape Example

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
