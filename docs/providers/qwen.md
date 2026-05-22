# Alibaba / Qwen / Wan Provider

| Property | Value |
| --- | --- |
| Provider id | `qwen` |
| Display name | Alibaba / Qwen / Wan |
| Capabilities | Chat - Speech-to-text - Realtime voice/omni - Image - Video |
| Default base URL | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Credential type | Model Studio API key |
| Auth method | API key; OpenAI-compatible or DashScope SDK depending on endpoint |
| Recommended env vars | `DASHSCOPE_API_KEY`, `ALIBABA_CLOUD_API_KEY` |
| API-key link | [Alibaba Model Studio API keys](https://bailian.console.aliyun.com/?tab=api#/api-key) |
| Official docs | [Alibaba Model Studio API key docs](https://www.alibabacloud.com/help/en/model-studio/get-api-key) |

## Model Catalog Source

The model sections below use the supplied provider/model catalog for this documentation update. They are based only on that supplied catalog.

Status values:

- `active`: listed as a current model in the supplied catalog.
- `deprecated`: transitional model; avoid new integrations unless required.
- `verify`: verify provider access and adapter support before production use.

## Model Type Coverage

| Model type | Documented models |
| --- | --- |
| Large Language Models | `qwen3.7-max`, `qwen3.6-plus`, `qwen3.6-flash` |
| Speech-To-Text Models | `qwen3.5-omni`, `qwen3-omni-flash` |
| Realtime Voice And Omni Models | `qwen-omni-realtime`, `qwen3.5-omni`, `qwen3-omni-flash` |
| Image Models | `qwen-image`, `qwen-image-edit` |
| Video Models | `wan2.7-t2v`, `wan2.7-i2v`, `wan2.7-video-edit` |

## Large Language Models

| Model id | Status |
| --- | --- |
| `qwen3.7-max` | `active` |
| `qwen3.6-plus` | `active` |
| `qwen3.6-flash` | `active` |

## Speech-To-Text Models

| Model id | Status |
| --- | --- |
| `qwen3.5-omni` | `active` |
| `qwen3-omni-flash` | `active` |

## Speech-To-Text Usage

Official Alibaba Model Studio docs:

- [Speech-to-text model guide](https://www.alibabacloud.com/help/en/model-studio/speech-recognition/)
- [Qwen-Omni HTTP guide](https://www.alibabacloud.com/help/en/model-studio/qwen-omni)
- [Qwen-Omni Realtime guide](https://www.alibabacloud.com/help/en/model-studio/realtime)
- [Qwen-Omni Realtime client events](https://www.alibabacloud.com/help/en/model-studio/client-events)

Alibaba documents Qwen-Omni speech-to-text as audio understanding, not as a
traditional ASR hotword endpoint. Use prompt context to tell the model how to
transcribe, normalize, or extract text from the audio.

| Friday catalog id | Upstream model ids | Runtime | How to use |
| --- | --- | --- | --- |
| `qwen3.5-omni` | `qwen3.5-omni-plus`, `qwen3.5-omni-flash`, `qwen3.5-omni-plus-realtime`, `qwen3.5-omni-flash-realtime` | HTTP for recorded audio; WebSocket for live audio | Catalog-level family id. Resolve it to one exact upstream model before calling Alibaba. Use Plus for stronger quality, Flash for lower cost/latency. Supports prompt context, emotion recognition, and 113 languages/dialects. Speaker diarization is not supported. |
| `qwen3-omni-flash` | `qwen3-omni-flash`, `qwen3-omni-flash-realtime` | HTTP for recorded audio; WebSocket for live audio | Previous-generation Qwen-Omni-Flash id. Supports prompt context and emotion recognition. Speaker diarization is not supported. Alibaba lists Chinese, English, Japanese, Korean, German, French, Italian, Spanish, Portuguese, Russian, and supported Chinese dialects. For the documented multimodal path, leave `enable_thinking` disabled unless a text-only thinking-mode flow is intentionally implemented. |

All listed Qwen speech-to-text models support common audio formats such as WAV,
MP3, and AAC. Non-realtime Qwen-Omni calls use per-request input limits. The
realtime Qwen-Omni models use WebSocket sessions that can run for up to 120
minutes.

### Recorded Audio Over HTTP

Use Alibaba's OpenAI-compatible Chat Completions endpoint when the input is an
audio file or a short near-realtime chunk.

| Region | Base URL |
| --- | --- |
| International / Singapore | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| China / Beijing | `https://dashscope.aliyuncs.com/compatible-mode/v1` |

Request shape:

```json
{
  "model": "qwen3.5-omni-flash",
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "input_audio",
          "input_audio": {
            "data": "data:;base64,<AUDIO_BASE64>",
            "format": "mp3"
          }
        },
        {
          "type": "text",
          "text": "Transcribe the audio verbatim. Return only the transcript."
        }
      ]
    }
  ],
  "modalities": ["text"],
  "stream": true,
  "stream_options": {
    "include_usage": true
  }
}
```

Implementation notes:

- Authenticate with `Authorization: Bearer $DASHSCOPE_API_KEY`.
- `input_audio.data` can be a public audio URL or a `data:;base64,...` payload.
- Match `input_audio.format` to the encoded file, for example `wav`, `mp3`, or
  `aac`.
- Read transcript text from streamed `choices[].delta.content` chunks. Chunks
  with no choices carry usage metadata.
- Use prompt text for domain vocabulary, formatting rules, language hints, or a
  strict "return only transcript" instruction.

### Live Audio Over WebSocket

Use Qwen-Omni-Realtime when Friday needs live dictation or streaming
transcription. Connect to the realtime endpoint with the exact realtime model
id:

```text
wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime?model=qwen3.5-omni-flash-realtime
```

Use the Beijing endpoint for China-region API keys:

```text
wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3.5-omni-flash-realtime
```

Start each session with `session.update`:

```json
{
  "type": "session.update",
  "session": {
    "modalities": ["text"],
    "input_audio_format": "pcm",
    "instructions": "Transcribe user speech verbatim. Return only transcript text.",
    "turn_detection": {
      "type": "server_vad",
      "threshold": 0.5,
      "silence_duration_ms": 800
    }
  }
}
```

Then send microphone PCM chunks as Base64:

```json
{
  "type": "input_audio_buffer.append",
  "audio": "<BASE64_PCM_AUDIO_CHUNK>"
}
```

Implementation notes:

- Authenticate the WebSocket with `Authorization: Bearer $DASHSCOPE_API_KEY`.
- With server VAD enabled, Alibaba commits the audio buffer automatically after
  speech stops. With manual mode, set `turn_detection` to `null`, then send
  `input_audio_buffer.commit` and `response.create`.
- For text-only output, consume `response.text.delta` and `response.text.done`.
  For text-plus-audio output, consume `response.audio_transcript.delta` and
  `response.audio_transcript.done`.
- The realtime examples also emit
  `conversation.item.input_audio_transcription.completed` for completed user
  input transcription.
- Friday's current renderer audio path uses PCM16 chunks, which matches the
  realtime API's `pcm` input format requirement.

## Realtime Voice And Omni Models

| Model id | Status |
| --- | --- |
| `qwen-omni-realtime` | `active` |
| `qwen3.5-omni` | `active` |
| `qwen3-omni-flash` | `active` |

## Image Models

| Model id | Status |
| --- | --- |
| `qwen-image` | `active` |
| `qwen-image-edit` | `active` |

## Video Models

| Model id | Status |
| --- | --- |
| `wan2.7-t2v` | `active` |
| `wan2.7-i2v` | `active` |
| `wan2.7-video-edit` | `active` |

## Related Docs

- [Provider catalog](index.md)
