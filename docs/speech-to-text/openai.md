# OpenAI Speech To Text

| Property | Value |
| --- | --- |
| Provider id | `openai` |
| Provider docs | [OpenAI provider](../providers/openai.md) |
| Default base URL | `https://api.openai.com/v1` |
| Credential | API key from the OpenAI provider record |
| Runtime adapter | `src/main/stt/openai-realtime-adapter.ts` |

## Catalog Models

| Model id | Display name | Status |
| --- | --- | --- |
| `gpt-realtime-whisper` | GPT Realtime Whisper | Implemented realtime transcription model |

The saved Friday model id is the transcription model. The OpenAI adapter opens
the realtime socket with an internal connection model, `gpt-realtime`, and sets
the transcription model in the realtime session update.

## Official Documentation

Official OpenAI docs checked on 2026-05-22:

- [Realtime transcription guide](https://platform.openai.com/docs/guides/realtime-transcription)
- [Speech to text guide](https://platform.openai.com/docs/guides/speech-to-text)
- [Audio transcription API reference](https://platform.openai.com/docs/api-reference/audio/transcribe)
- [Realtime API guide](https://platform.openai.com/docs/guides/realtime/session)

## Runtime Behavior

The default `SpeechToTextService` registers the OpenAI realtime adapter. It
supports provider id `openai` when the model resolves to
`gpt-realtime-whisper`.

Startup:

1. Load the configured `speechToText` operator from `StoreService`.
2. Resolve the OpenAI provider record and API key.
3. Open an OpenAI realtime WebSocket for transcription.
4. Send a `session.update` with `type: "transcription"`.
5. Configure input audio as PCM at `REALTIME_TRANSCRIPTION_SAMPLE_RATE`.
6. Disable turn detection; Friday commits audio buffers itself.

Audio flow:

- Renderer audio is sent as base64 PCM16 chunks.
- The adapter appends audio with `input_audio_buffer.append`.
- The adapter commits after the streaming threshold and on `finish`.
- `finish` waits for pending final transcription events before closing.

Event mapping:

| Provider event | Friday event |
| --- | --- |
| `conversation.item.input_audio_transcription.delta` | `delta` |
| `input_audio_buffer.committed` | `committed` |
| `conversation.item.input_audio_transcription.completed` | `completed` |
| `conversation.item.input_audio_transcription.failed` | `error` |
| socket close | `closed` |

## Implementation Approach

Keep OpenAI behind a realtime adapter. The adapter should resolve Friday's saved
catalog id to the upstream transcription model accepted by OpenAI, open a
transcription-only realtime session, and keep the realtime socket model as an
adapter detail. Friday should continue to control buffer commits instead of
using provider VAD for dictation, because the renderer already owns start,
finish, and cancel state.

If OpenAI's currently documented transcription model list differs from Friday's
stored catalog id, update only the adapter mapping and catalog documentation
together. Do not leak the OpenAI socket model or provider-specific session
shape into renderer or task payloads.

## Notes

- `gpt-4o-transcribe` and `gpt-4o-mini-transcribe` exist as legacy constants in
  source, but they are not current selectable STT catalog entries.
- The adapter normalizes simple language hints such as `en` or `en-US` into the
  realtime transcription config.
- A provider error about an input audio buffer being too small during an
  intentional close is treated as a clean close.
