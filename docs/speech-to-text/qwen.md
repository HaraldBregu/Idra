# Qwen Speech To Text

| Property | Value |
| --- | --- |
| Provider id | `qwen` |
| Provider docs | [Alibaba / Qwen / Wan provider](../providers/qwen.md) |
| Default base URL | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Credential | Model Studio API key from the Qwen provider record |
| Auth method | `Authorization: Bearer <api key>` |
| Runtime adapter | `src/main/stt/qwen-realtime-adapter.ts` |

## Catalog Models

| Catalog model id | Upstream realtime model | Status |
| --- | --- | --- |
| `qwen3.5-omni` | `qwen3.5-omni-flash-realtime` | Implemented realtime transcription |
| `qwen3-omni-flash` | `qwen3-omni-flash-realtime` | Implemented realtime transcription |

The catalog stores family-level STT model ids. The adapter resolves each
catalog id to an exact upstream realtime model before opening the WebSocket.

## Runtime Behavior

The default `SpeechToTextService` registers the Qwen realtime adapter for
provider id `qwen`.

Endpoint selection:

- International/Singapore base URLs use
  `wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime`.
- China/Beijing base URLs use
  `wss://dashscope.aliyuncs.com/api-ws/v1/realtime`.
- Custom base URLs are converted to a WebSocket URL at `/api-ws/v1/realtime`.

Startup sends `session.update` with text-only output, PCM audio input, explicit
transcription instructions, and no turn detection. If the caller passes a valid
language hint, the adapter appends it to the instructions.

Audio flow:

- Renderer audio is sent as base64 PCM16 chunks.
- The adapter sends each chunk with `input_audio_buffer.append`.
- `finish` sends `input_audio_buffer.commit`.
- The adapter then sends `response.create` with text output.

Event mapping:

| Provider event | Friday event |
| --- | --- |
| `response.text.delta` | `delta` |
| `response.audio_transcript.delta` | `delta` |
| `response.text.done` | `completed` |
| `response.audio_transcript.done` | `completed` |
| `conversation.item.input_audio_transcription.completed` | `completed` |
| `error` | `error` |
| socket close | `closed` |

## Notes

- Qwen-Omni STT behaves like prompted audio understanding. The adapter asks for
  verbatim transcript text and text-only output.
- Speaker diarization is not part of the current Friday Qwen STT path.
- Recorded-audio HTTP usage is documented in [providers/qwen.md](../providers/qwen.md)
  but the default Friday dictation runtime uses the realtime WebSocket path.
