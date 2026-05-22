# ElevenLabs Speech To Text

| Property | Value |
| --- | --- |
| Provider id | `elevenlabs` |
| Provider docs | [ElevenLabs provider](../providers/elevenlabs.md) |
| Default base URL | `https://api.elevenlabs.io/v1` |
| Credential | API key from the ElevenLabs provider record |
| Auth method | `xi-api-key` header |
| Runtime adapter | `src/main/stt/elevenlabs-realtime-adapter.ts` |

## Catalog Models

| Model id | Display name | Runtime style | Status |
| --- | --- | --- | --- |
| `scribe_v2` | Scribe v2 | Batch request behind the session interface | Implemented |
| `scribe_v2_realtime` | Scribe v2 Realtime | WebSocket realtime transcription | Implemented |

## Runtime Behavior

The default `SpeechToTextService` registers one ElevenLabs adapter that supports
both catalog models.

For `scribe_v2`, the adapter buffers renderer PCM16 audio until `finish`, wraps
the collected bytes in a mono WAV file, and sends a multipart request to
`/speech-to-text` with `model_id=scribe_v2`. It emits `committed` before the
request and `completed` when the provider response contains transcript text.

For `scribe_v2_realtime`, the adapter opens `/speech-to-text/realtime` with:

- `model_id=scribe_v2_realtime`
- `audio_format=pcm_24000`
- `commit_strategy=manual`
- optional `language_code` derived from the request language

The realtime adapter sends each audio chunk as an `input_audio_chunk` message.
On `finish`, it sends a short silence chunk with `commit: true` so ElevenLabs
finalizes the transcript.

Event mapping:

| Provider event | Friday event |
| --- | --- |
| `partial_transcript` | `delta` |
| `committed_transcript` | `completed` |
| `committed_transcript_with_timestamps` | `completed` |
| `error` | `error` |
| socket close | `closed` |

## Notes

- The batch path still implements `SpeechToTextRealtimeSession` so the renderer
  can use the same start, append, finish, and cancel flow.
- Language hints are normalized to a two- or three-letter primary language code
  before being sent as `language_code`.
- Provider-specific options such as diarization, timestamps, redaction, and
  webhook delivery are documented in [providers/elevenlabs.md](../providers/elevenlabs.md)
  but are not part of Friday's realtime dictation path today.
