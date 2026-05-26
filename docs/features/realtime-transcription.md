# Realtime Transcription

Realtime transcription lets the renderer start a speech-to-text session, stream audio to the configured provider, and receive transcription events back over typed IPC.

## Functionality

- Resolves the configured speech-to-text provider and model from settings.
- Validates that the selected model is allowed for speech-to-text.
- Requires a saved API key for the selected provider.
- Starts renderer-owned sessions and closes them when the owning web contents is destroyed.
- Accepts appended audio, finish, cancel, and close operations.
- Sends transcription events back through the realtime transcription IPC channel.

## Runtime Adapters

The current local adapters cover:

- OpenAI
- Deepgram
- ElevenLabs
- Mistral
- xAI
- Qwen

The service rejects unsupported provider/model pairs instead of silently falling back.

## Source

- `src/main/stt/service.ts`
- `src/main/stt/types.ts`
- `src/main/stt/*-realtime-adapter.ts`
- `src/main/ipc/realtime-transcription-ipc.ts`
- `src/shared/realtime-transcription.ts`
- `src/renderer/src/pages/home/hooks/useRealtimeDictation.ts`

