# Speech To Text

This document describes how Friday uses speech-to-text models for live
dictation.

## Source Of Truth

- `src/shared/service.ts`: speech-to-text operator id, provider id, supported
  model list, realtime sample rate, and model validation helper.
- `src/main/store/service.ts`: persisted `operator.speechToText` selection and
  legacy `speechTranscriber` compatibility.
- `src/main/ipc/app-ipc.ts`: Settings IPC for reading and saving the
  speech-to-text operator.
- `src/main/ipc/realtime-transcription-ipc.ts`: runtime transcription session,
  OpenAI realtime socket, audio commit thresholds, and event forwarding.
- `src/shared/realtime-transcription.ts`: renderer-safe session and event
  types.
- `src/preload/index.ts`: `window.realtimeTranscription` preload API.
- `src/renderer/src/pages/home/hooks/useRealtimeDictation.ts`: microphone
  capture, PCM conversion, audio streaming, and transcript application.

## Supported Model

Friday currently allows one speech-to-text model:

| Provider | Operator model id | Display name | Runtime status |
| --- | --- | --- | --- |
| `openai` | `gpt-realtime-whisper` | GPT Realtime Whisper | Implemented |

The allowed model list is `SPEECH_TO_TEXT_MODELS` in `src/shared/service.ts`.
The validation helper is `isRealtimeSpeechTranscriberModel()`.

There are two model identifiers in the runtime path:

- `gpt-realtime-whisper` is the configured transcription model stored on the
  speech-to-text operator and sent in the realtime `session.update` payload.
- `gpt-realtime` is the OpenAI realtime WebSocket connection model used by
  `OpenAIRealtimeWebSocket`.

Do not replace one with the other. The socket is opened with `gpt-realtime`,
then the session config selects `gpt-realtime-whisper` for input audio
transcription.

## Operator Selection

The speech-to-text operator is:

```ts
operator.speechToText
```

It stores a public provider record and a selected model:

```ts
{
	id: 'speech-to-text',
	name: 'Speech to text',
	docsPath: 'speech-to-text.md',
	status: 'implemented',
	provider: {
		id: 'openai',
		name: 'OpenAI',
		baseUrl: 'https://api.openai.com/v1'
	},
	model: {
		id: 'gpt-realtime-whisper',
		name: 'GPT Realtime Whisper'
	}
}
```

Credentials are not stored on the operator. The API key is resolved from the
stored OpenAI provider record when dictation starts.

Settings can read and save the operator through:

- `operator:get-speech-to-text`
- `operator:save-speech-to-text`

Legacy compatibility IPC still exists:

- `provider:get-speech-transcriber-service`
- `provider:save-speech-transcriber-service`

Both save paths enforce the same rules:

- Provider id must be `openai`.
- Model id must exist in `SPEECH_TO_TEXT_MODELS`.
- Saved model data is reduced to `{ id, name }`.

## Startup And Settings

The first-run setup page saves the speech-to-text operator automatically when
OpenAI is connected and a transcription model is selected. The current setup
model list contains `gpt-realtime-whisper`.

The Settings operator details page also supports the same selection:

1. It loads configured providers.
2. It filters available speech-to-text providers to OpenAI.
3. It uses `SPEECH_TO_TEXT_MODELS` as the model picker list.
4. It saves through `window.app.saveSpeechToTextOperator()`.

## Runtime Flow

Live dictation uses the preload API:

```ts
const session = await window.realtimeTranscription.start({ language: 'en' });
window.realtimeTranscription.appendAudio(session.id, audioBase64);
await window.realtimeTranscription.finish(session.id);
```

Runtime startup:

1. `realtime-transcription:start` calls `store.getSpeechToTextOperator()`.
2. The main process verifies that the operator is configured.
3. It verifies provider `openai` and model `gpt-realtime-whisper`.
4. It loads the OpenAI API key and base URL from `StoreService.getProviderById('openai')`.
5. It creates an OpenAI client and an `OpenAIRealtimeWebSocket`.
6. The socket URL is forced to `intent=transcription`.
7. The socket opens with realtime socket model `gpt-realtime`.
8. Friday sends a `session.update` with audio transcription model
   `gpt-realtime-whisper`.

If any required setting is missing, startup fails before audio is streamed.

## Audio Format

Renderer capture:

- `useRealtimeDictation()` requests microphone audio with echo cancellation,
  noise suppression, and one channel.
- The renderer creates an `AudioContext` using the session sample rate returned
  by the main process.
- Audio frames are converted to 16-bit PCM and base64 encoded before IPC send.

Main-process session config:

- Input format: PCM audio.
- Sample rate: `REALTIME_TRANSCRIPTION_SAMPLE_RATE`, currently `24000`.
- Turn detection: disabled.
- Optional language: normalized BCP-47-style two-letter language with optional
  region, for example `en` or `en-US`.

Commit thresholds:

- Minimum commit size is 100 ms of PCM16 audio.
- Streaming commit size is 300 ms of PCM16 audio.
- `appendAudio` commits automatically once the streaming threshold is reached.
- `finish` commits any remaining audio if it meets the minimum threshold.

## Events

The main process forwards realtime transcription events to the renderer as
`RealtimeTranscriptionEvent`:

- `started`: session was created and configured.
- `delta`: partial transcript text arrived.
- `committed`: an audio buffer commit was accepted.
- `completed`: final transcript text arrived for an item.
- `error`: socket or transcription error.
- `closed`: session closed.

`useRealtimeDictation()` applies transcript updates to the prompt input. It
keeps the original prompt text as a base, appends partial/final transcript text,
and cancels or finishes the realtime session when the user stops recording.

## Failure Cases

Common startup failures:

- Speech-to-text operator is not configured.
- Saved provider is not OpenAI.
- Saved model is not `gpt-realtime-whisper`.
- OpenAI provider is missing.
- OpenAI API key is empty.
- Realtime socket connection times out.

Common runtime behavior:

- If the renderer is destroyed, the session is closed.
- If the session owner does not match the IPC sender, finish/cancel fails.
- A too-small input audio buffer error during intentional close is treated as a
  clean close.
- Other socket or transcription errors are sent to the renderer as `error`
  events.

