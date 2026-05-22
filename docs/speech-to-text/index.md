# Speech To Text Providers

This folder documents provider-specific speech-to-text behavior for the
providers listed in `SPEECH_TO_TEXT_MODELS_BY_PROVIDER` and in the provider
catalog.

Friday keeps one speech-to-text module contract. Provider credentials, base
URLs, and private configuration stay on provider records. The renderer sends
base64-encoded PCM16 audio to the main process, and provider adapters normalize
provider events into Friday realtime transcription events.

## Provider Matrix

| Provider | Provider id | Catalog models | Default runtime status | Runbook |
| --- | --- | --- | --- | --- |
| OpenAI | `openai` | `gpt-realtime-whisper` | Realtime adapter registered | [openai.md](openai.md) |
| ElevenLabs | `elevenlabs` | `scribe_v2`, `scribe_v2_realtime` | Batch and realtime adapter registered | [elevenlabs.md](elevenlabs.md) |
| Mistral AI | `mistral` | `voxtral-mini-2602`, `voxtral-mini-transcribe-realtime-2602` | Batch and realtime adapter registered | [mistral.md](mistral.md) |
| Alibaba / Qwen / Wan | `qwen` | `qwen3.5-omni`, `qwen3-omni-flash` | Realtime adapter registered | [qwen.md](qwen.md) |
| Deepgram | `deepgram` | `nova-3`, `flux` | Catalog only; adapter not registered | [deepgram.md](deepgram.md) |
| xAI | `xai` | `xai-stt-batch`, `xai-stt-streaming` | Catalog only; adapter not registered | [xai.md](xai.md) |

The catalog can validate all listed provider/model pairs. Runtime startup still
requires a registered adapter that returns `true` from `supports(providerId,
modelId)`. If no adapter supports the saved pair, `SpeechToTextService.start`
fails before audio is streamed.

## Runtime Contract

- Store settings under the root `speechToText` key with only `providerId` and
  `modelId`.
- Resolve API keys and base URLs from `StoreService.getProviderById(providerId)`.
- Use `REALTIME_TRANSCRIPTION_SAMPLE_RATE`, currently `24000`, for renderer
  audio capture and adapter input unless an adapter performs its own conversion.
- Emit only Friday `RealtimeTranscriptionEvent` values: `started`, `delta`,
  `committed`, `completed`, `error`, and `closed`.
- Batch adapters may implement the same session interface by buffering audio
  until `finish` and then emitting one completed transcript.

## Source Files

- STT catalog: `src/shared/provider-models.ts`
- STT service and adapter registry: `src/main/stt/service.ts`
- Shared audio thresholds: `src/main/stt/audio.ts`
- Provider credential catalog: [providers/index.md](../providers/index.md)
- Module contract: [models/speech-to-text.md](../models/speech-to-text.md)

## Adding A Provider

1. Add concrete model ids to `SPEECH_TO_TEXT_MODELS_BY_PROVIDER`.
2. Document the provider under `providers/` and in this folder.
3. Add a provider adapter under `src/main/stt`.
4. Register the adapter in `SpeechToTextService`.
5. Normalize provider events to Friday realtime transcription events.
6. Keep credentials and base URLs on provider records, not in `speechToText`.
