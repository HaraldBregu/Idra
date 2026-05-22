# Qwen Speech To Text

| Property | Value |
| --- | --- |
| Provider id | `qwen` |
| Provider docs | [Alibaba / Qwen / Wan provider](../providers/qwen/) |
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

## Official Documentation

Official Alibaba Model Studio docs checked on 2026-05-22:

- [Speech-to-text model selection](https://www.alibabacloud.com/help/en/model-studio/speech-recognition/)
- [Qwen-Omni realtime guide](https://www.alibabacloud.com/help/en/model-studio/realtime)
- [Qwen-Omni realtime client events](https://www.alibabacloud.com/help/en/model-studio/client-events)
- [Qwen-Omni realtime server events](https://www.alibabacloud.com/help/doc-detail/2922855.html)
- [Qwen-ASR realtime guide](https://www.alibabacloud.com/help/en/model-studio/qwen-real-time-speech-recognition)

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

## Implementation Approach

Implement Qwen as a realtime adapter that treats Friday's catalog ids as stable
family selectors. The adapter should choose the exact upstream realtime model,
derive the correct regional WebSocket endpoint from the provider base URL, send
a transcription-focused session update, stream PCM chunks, and request text-only
output when Friday finishes the audio buffer.

The current catalog uses Qwen-Omni models, so prompt instructions are part of
the adapter's provider-specific behavior. If Friday later switches to dedicated
Qwen-ASR models, add new catalog ids and a separate mapping rather than changing
the meaning of the existing Qwen-Omni ids silently.

## Notes

- Qwen-Omni STT behaves like prompted audio understanding. The adapter asks for
  verbatim transcript text and text-only output.
- Speaker diarization is not part of the current Friday Qwen STT path.
- Recorded-audio HTTP usage is documented in [providers/qwen/](../providers/qwen/)
  but the default Friday dictation runtime uses the realtime WebSocket path.
