# Deepgram Speech To Text

| Property | Value |
| --- | --- |
| Provider id | `deepgram` |
| Provider docs | [Deepgram provider](../providers/deepgram.md) |
| Default base URL | `https://api.deepgram.com/v1` |
| Credential | API key from the Deepgram provider record |
| Runtime adapter | Not registered in the default STT service |

## Catalog Models

| Model id | Display name | Runtime status |
| --- | --- | --- |
| `nova-3` | Nova 3 | Cataloged; adapter pending |
| `flux` | Flux | Cataloged; adapter pending |

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

## Notes

- Do not mark Deepgram as live-dictation ready in UI or release notes until the
  adapter is registered.
- If a future adapter supports both batch and streaming Deepgram modes, it
  should still expose the same Friday start, append, finish, and cancel
  session contract used by the existing STT adapters.
