# Multiprovider And Multimodel Support

Friday separates model provider configuration, model catalogs, and runtime adapters so different features can use different providers and models.

## Assistant Runtime

The main assistant has local runtime adapters for:

- Anthropic
- OpenAI
- Mistral
- DeepSeek
- Qwen
- OpenAI-compatible fallback providers

The agent service resolves the configured provider and model at run time, checks for an API key, creates the provider adapter, and streams through a provider-neutral agent loop. OpenAI reasoning effort settings are validated for supported OpenAI models.

## Speech-To-Text Runtime

Realtime transcription has local runtime adapters for:

- OpenAI
- Deepgram
- ElevenLabs
- Mistral
- xAI
- Qwen

The speech-to-text service resolves the configured provider/model from settings, validates that the model is allowed, starts a session owned by the renderer web contents, streams audio, and cleans up when the owner closes.

## Model Catalogs

The shared model catalogs currently cover these capabilities:

- `llm`
- `research-chat`
- `speech-to-text`
- `text-to-speech`
- `realtime-voice`
- `text-to-image`
- `text-to-video`
- `text-to-audio`
- `music`
- `3d`
- `embedding`

Text-to-speech, image, video, music/audio, realtime voice, 3D, and OCR operators have settings surfaces or catalogs, but not all of them have a local execution runtime yet. The settings metadata marks some of these operators as `pending-runtime` or coming soon.

## Source

- `src/main/provider`
- `src/main/stt`
- `src/shared/providers`
- `src/shared/agents/service.ts`
- `src/renderer/src/pages/settings/pages/providers`
- `src/renderer/src/pages/settings/navigation.ts`
- Existing docs: `docs/providers/index.md`

