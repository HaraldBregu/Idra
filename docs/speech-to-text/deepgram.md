# Deepgram Speech To Text

| Property | Value |
| --- | --- |
| Provider id | `deepgram` |
| Provider docs | [Deepgram provider](../providers/deepgram/) |
| Default base URL | `https://api.deepgram.com/v1` |
| Credential | API key from the Deepgram provider record |
| Runtime adapter | Not registered in the default STT service |

## Catalog Models

| Model id | Display name | Runtime status |
| --- | --- | --- |
| `nova-3` | Nova 3 | Cataloged; adapter pending |
| `flux` | Flux | Cataloged; adapter pending |

## Official Documentation

Official Deepgram docs checked on 2026-05-22:

- [Deepgram documentation overview](https://developers.deepgram.com/documentation/)
- [Nova pre-recorded quickstart](https://developers.deepgram.com/docs/nova-quickstart)
- [Live audio API reference](https://developers.deepgram.com/reference/listen-live)
- [Pre-recorded audio API reference](https://developers.deepgram.com/reference/pre-recorded)
- [Flux quickstart](https://developers.deepgram.com/docs/flux/quickstart)

## Runtime Status

Deepgram is present in `SPEECH_TO_TEXT_MODELS_BY_PROVIDER`, so the catalog can
list and validate its STT model ids. The default `SpeechToTextService` does not
currently register a Deepgram adapter.

Starting realtime transcription with provider id `deepgram` will pass catalog
validation but fail at runtime with the service error for a missing
speech-to-text adapter.

## Adapter Requirements

Before Deepgram is runtime-ready:

1. Add a Deepgram adapter under `src/main/stt`.
2. Implement `supports('deepgram', modelId)` for `nova-3` and `flux`.
3. Register the adapter in `SpeechToTextService`.
4. Normalize Deepgram partial, final, error, and close events to Friday
   realtime transcription events.
5. Keep API keys and base URLs on the provider record.

## Implementation Approach

Implement Deepgram with explicit model-specific behavior. For `nova-3`, prefer
Deepgram's live `/v1/listen` WebSocket for dictation and keep the pre-recorded
endpoint available only if Friday intentionally exposes a batch transcription
mode. Send Friday's PCM stream with matching encoding and sample-rate query
parameters, request interim results for partial UI updates, and finalize the
stream when Friday calls `finish`.

For `flux`, treat it as a conversational streaming model rather than a generic
file transcription model. Its adapter should map provider turn-taking or
speech-final signals into Friday `completed` events. If Flux requires a
different control flow from Friday's manual commit model, keep that difference
inside the adapter and document the tradeoff before enabling it in the UI.

## Notes

- Do not mark Deepgram as live-dictation ready in UI or release notes until the
  adapter is registered.
- If a future adapter supports both batch and streaming Deepgram modes, it
  should still expose the same Friday start, append, finish, and cancel
  session contract used by the existing STT adapters.
