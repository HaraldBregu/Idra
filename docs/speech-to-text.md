# Speech To Text

This document describes how Friday should use speech-to-text models for live
dictation and other audio transcription features.

## Source Of Truth

- `src/shared/service.ts`: speech-to-text module id, current settings shape,
  model metadata, realtime sample rate, and model validation helpers.
- `src/main/store/service.ts`: persisted speech-to-text module selection and
  legacy speech transcriber compatibility.
- `src/main/ipc/app-ipc.ts`: Settings IPC for reading and saving the
  speech-to-text module selection.
- `src/main/ipc/realtime-transcription-ipc.ts`: realtime transcription IPC
  boundary, audio commit thresholds, and event forwarding.
- `src/shared/realtime-transcription.ts`: renderer-safe session and event
  types.
- `src/preload/index.ts`: `window.realtimeTranscription` preload API.
- `src/renderer/src/pages/home/hooks/useRealtimeDictation.ts`: microphone
  capture, PCM conversion, audio streaming, and transcript application.

## Main Process Module

Speech to text should be a separated module in the main process. The renderer
should not know which provider or model is used, and IPC handlers should only
translate renderer calls into module calls.

The main-process speech-to-text module owns:

- Reading its saved settings from `StoreService`.
- Resolving the configured provider record from `StoreService`.
- Loading provider credentials and base URL from the configured provider record.
- Selecting the correct speech-to-text runtime adapter for the provider and
  model.
- Normalizing provider-specific transcript events into Friday transcription
  events.
- Closing sessions when the renderer goes away.

Provider-specific code belongs behind adapters inside this module. For example,
an OpenAI realtime adapter can use OpenAI-specific socket setup internally, but
the speech-to-text module contract remains provider-neutral.

## Service And Tool Exposure

Speech to text can be exposed as both a service and an LLM tool. Live dictation
uses the service path today. A future LLM tool must stay a thin wrapper around
the speech-to-text service and must not accept provider credentials, base URLs,
or raw provider records.

## Supported Providers And Models

Speech to text is not limited to a single provider or model. Any configured
provider can be used if Friday has a speech-to-text adapter for it and the
selected model supports speech-to-text input.

The Settings model picker should show provider/model choices that have a
speech-to-text capability. Saving the module selection should validate
capability compatibility, not a hard-coded provider id.

Example speech-to-text provider/model choices:

| Provider | Model id | Runtime style |
| --- | --- | --- |
| `openai` | `gpt-realtime-whisper` | Realtime streaming |
| Any speech-to-text capable provider | Provider model id | Realtime or batch |
| Local speech-to-text runtime | Local model id | On-device transcription |

Some providers may require more than one model identifier internally. For
example, an OpenAI realtime adapter can open a socket with one realtime model
and select a transcription model in the session config:

- `gpt-realtime-whisper` is the configured transcription model stored on the
  speech-to-text module selection and sent in the adapter's transcription
  config.
- `gpt-realtime` is the OpenAI realtime WebSocket connection model used by
  that adapter.

Do not make that adapter detail the global speech-to-text contract. Other
providers may use only one model id, a batch endpoint, a streaming endpoint, or
a local model.

## Module Settings

The speech-to-text module stores a public provider record and a selected model:

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

Credentials are not stored on the module selection. The API key, base URL, and
any other private provider configuration are resolved from the stored provider
record when transcription starts.

Settings can read and save the module selection through Settings IPC. Legacy
compatibility IPC still exists:

- `provider:get-speech-transcriber-service`
- `provider:save-speech-transcriber-service`

Both save paths should enforce the same rules:

- Provider id must reference a configured provider.
- Model id must be valid for that provider and support speech to text.
- Saved model data is reduced to `{ id, name }`.

## Startup And Settings

The first-run setup page can save the speech-to-text module selection
automatically when a speech-to-text capable provider is connected and a
transcription model is selected.

The Settings module details page also supports the same selection:

1. It loads configured providers.
2. It filters available providers to providers with speech-to-text capable
   models.
3. It uses the selected provider's speech-to-text capable model list as the
   model picker list.
4. It saves through the speech-to-text settings preload API.

## Runtime Flow

Live dictation uses the preload API:

```ts
const session = await window.realtimeTranscription.start({ language: 'en' });
window.realtimeTranscription.appendAudio(session.id, audioBase64);
await window.realtimeTranscription.finish(session.id);
```

Runtime startup:

1. `realtime-transcription:start` loads saved speech-to-text settings from
   `StoreService`.
2. The main process verifies that the speech-to-text settings are configured.
3. It reads provider id and model id from the saved settings.
4. It loads API key, base URL, and provider configuration from
   `StoreService.getProviderById(providerId)`.
5. It creates the speech-to-text adapter for the selected provider and model.
6. The adapter starts a realtime or batch transcription session.
7. Friday forwards normalized transcript events back to the renderer.

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

- Speech-to-text module settings are not configured.
- Saved provider is missing.
- Saved model is missing or does not support speech to text for that provider.
- Provider credentials are missing.
- No speech-to-text adapter exists for the selected provider/model pair.
- The provider connection or transcription session times out.

Common runtime behavior:

- If the renderer is destroyed, the session is closed.
- If the session owner does not match the IPC sender, finish/cancel fails.
- A too-small input audio buffer error during intentional close is treated as a
  clean close.
- Other socket or transcription errors are sent to the renderer as `error`
  events.
