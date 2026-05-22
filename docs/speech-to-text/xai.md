# xAI Speech To Text

| Property | Value |
| --- | --- |
| Provider id | `xai` |
| Provider docs | [xAI provider](../providers/xai.md) |
| Default base URL | `https://api.x.ai/v1` |
| Credential | API key from the xAI provider record |
| Auth method | HTTP Bearer token |
| Runtime adapter | Not registered in the default STT service |

## Catalog Models

| Model id | Display name | Runtime status |
| --- | --- | --- |
| `xai-stt-batch` | xAI STT Batch | Cataloged; adapter pending |
| `xai-stt-streaming` | xAI STT Streaming | Cataloged; adapter pending |

## Runtime Status

xAI is present in `SPEECH_TO_TEXT_MODELS_BY_PROVIDER`, so the catalog can list
and validate its STT model ids. The default `SpeechToTextService` does not
currently register an xAI speech-to-text adapter.

Starting realtime transcription with provider id `xai` will pass catalog
validation but fail at runtime with the service error for a missing
speech-to-text adapter.

## Adapter Requirements

Before xAI is runtime-ready:

1. Verify the official xAI speech-to-text API shape for both batch and
   streaming model ids.
2. Add an xAI adapter under `src/main/stt`.
3. Implement `supports('xai', modelId)` for `xai-stt-batch` and
   `xai-stt-streaming`.
4. Register the adapter in `SpeechToTextService`.
5. Normalize provider partial, final, error, and close events to Friday
   realtime transcription events.
6. Keep API keys and base URLs on the provider record.

## Notes

- The provider catalog already documents the xAI STT model ids.
- The runtime should not infer xAI STT behavior from its OpenAI-compatible chat
  adapter. Speech-to-text needs its own adapter and event normalization.
