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

Speech-to-text models:

| Model id | Display name | Runtime style |
| --- | --- | --- |
| `flux-general-en` | Flux General English | Realtime voice-agent transcription |
| `flux-general-multi` | Flux General Multilingual | Realtime voice-agent transcription |
| `nova-3` | Nova-3 | Batch or streaming transcription |
| `nova-3-general` | Nova-3 General | Batch or streaming transcription |
| `nova-3-medical` | Nova-3 Medical | Medical transcription |
| `nova-2` | Nova-2 | Batch or streaming transcription |
| `nova-2-general` | Nova-2 General | Batch or streaming transcription |
| `nova-2-meeting` | Nova-2 Meeting | Meeting transcription |
| `nova-2-phonecall` | Nova-2 Phone Call | Phone-call transcription |
| `nova-2-finance` | Nova-2 Finance | Finance transcription |
| `nova-2-conversationalai` | Nova-2 Conversational AI | Conversational AI transcription |
| `nova-2-voicemail` | Nova-2 Voicemail | Voicemail transcription |
| `nova-2-video` | Nova-2 Video | Video transcription |
| `nova-2-medical` | Nova-2 Medical | Medical transcription |
| `nova-2-drivethru` | Nova-2 Drive-Thru | Drive-thru transcription |
| `nova-2-automotive` | Nova-2 Automotive | Automotive transcription |
| `nova-2-atc` | Nova-2 ATC | Air traffic control transcription |
| `nova-2-<CUSTOM>` | Nova-2 Custom | Custom transcription model |
| `nova` | Nova | Legacy transcription |
| `nova-general` | Nova General | Legacy transcription |
| `nova-phonecall` | Nova Phone Call | Legacy phone-call transcription |
| `nova-medical` | Nova Medical | Legacy medical transcription |
| `nova-<CUSTOM>` | Nova Custom | Custom legacy transcription model |
| `enhanced` | Enhanced | Legacy enhanced transcription |
| `enhanced-general` | Enhanced General | Legacy enhanced transcription |
| `enhanced-meeting` | Enhanced Meeting | Legacy meeting transcription |
| `enhanced-phonecall` | Enhanced Phone Call | Legacy phone-call transcription |
| `enhanced-finance` | Enhanced Finance | Legacy finance transcription |
| `enhanced-<CUSTOM>` | Enhanced Custom | Custom legacy enhanced transcription model |
| `base` | Base | Legacy base transcription |
| `base-general` | Base General | Legacy base transcription |
| `base-meeting` | Base Meeting | Legacy meeting transcription |
| `base-phonecall` | Base Phone Call | Legacy phone-call transcription |
| `base-finance` | Base Finance | Legacy finance transcription |
| `base-conversationalai` | Base Conversational AI | Legacy conversational AI transcription |
| `base-voicemail` | Base Voicemail | Legacy voicemail transcription |
| `base-video` | Base Video | Legacy video transcription |
| `base-<CUSTOM>` | Base Custom | Custom legacy base transcription model |
| `whisper` | Whisper Medium | Deepgram Whisper Cloud |
| `whisper-tiny` | Whisper Tiny | Deepgram Whisper Cloud |
| `whisper-base` | Whisper Base | Deepgram Whisper Cloud |
| `whisper-small` | Whisper Small | Deepgram Whisper Cloud |
| `whisper-medium` | Whisper Medium | Deepgram Whisper Cloud |
| `whisper-large` | Whisper Large | Deepgram Whisper Cloud |

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
