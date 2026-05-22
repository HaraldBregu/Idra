# Mistral Speech To Text

| Property | Value |
| --- | --- |
| Provider id | `mistral` |
| Provider docs | [Mistral provider](../providers/mistral.md) |
| Default base URL | `https://api.mistral.ai/v1` |
| Credential | API key from the Mistral provider record |
| Auth method | HTTP Bearer token |
| Runtime adapter | `src/main/stt/mistral-realtime-adapter.ts` |

## Catalog Models

| Model id | Display name | Runtime style | Status |
| --- | --- | --- | --- |
| `voxtral-mini-2602` | Voxtral Mini 2602 | Batch transcription behind the session interface | Implemented |
| `voxtral-mini-transcribe-realtime-2602` | Voxtral Mini Transcribe Realtime 2602 | Realtime SDK connection | Implemented |

## Official Documentation

Official Mistral docs checked on 2026-05-22:

- [Audio and transcription overview](https://docs.mistral.ai/studio-api/audio/speech_to_text)
- [Offline transcription](https://docs.mistral.ai/studio-api/audio/speech_to_text/offline_transcription)
- [Realtime transcription](https://docs.mistral.ai/studio-api/audio/speech_to_text/realtime_transcription)
- [Voxtral Mini Transcribe model card](https://docs.mistral.ai/models/model-cards/voxtral-mini-transcribe-25-07)

## Runtime Behavior

The default `SpeechToTextService` registers the Mistral adapter for provider id
`mistral`.

For `voxtral-mini-2602`, the adapter buffers renderer PCM16 audio until
`finish`, wraps the audio in a mono WAV file, and calls Mistral offline
transcription through the Mistral SDK. It uses the provider base URL with a
trailing `/v1` removed when constructing the SDK server URL.

For `voxtral-mini-transcribe-realtime-2602`, the adapter uses Mistral's
realtime SDK. It connects with:

- audio encoding `PcmS16le`
- sample rate `REALTIME_TRANSCRIPTION_SAMPLE_RATE`
- a realtime server URL derived from the provider base URL, defaulting to
  `wss://api.mistral.ai`

On `finish`, the realtime adapter flushes audio, ends the stream, and waits for
a final transcription event before closing.

Event mapping:

| Provider event | Friday event |
| --- | --- |
| `transcription.text.delta` | `delta` |
| `transcription.done` | `completed` |
| `error` | `error` |
| connection close | `closed` |

## Implementation Approach

Implement Mistral with separate batch and realtime session behavior behind one
adapter. The batch path should buffer audio, submit one offline transcription
request on `finish`, and emit one final transcript. The realtime path should use
Mistral's realtime transcription API, send Friday's PCM16 chunks as the declared
audio stream, and map Mistral text deltas and done events to Friday's event
contract.

Mistral-specific features such as diarization, timestamp granularity, context
bias, and target streaming delay should remain adapter options until Friday has
explicit settings for them. Do not add those fields to `speechToText` by
default.

## Notes

- Language hints such as `en` or `en-US` are passed to the offline
  transcription request when present.
- The realtime path accumulates deltas locally so `transcription.done` can
  still produce a complete transcript if the final event does not include text.
- Mistral streaming transcription from an existing file is different from the
  realtime microphone path and is not the runtime used by Friday dictation.
