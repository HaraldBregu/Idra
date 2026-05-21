# Text To Speech

This document describes how Friday should use text-to-speech models for spoken
audio output.

## Source Of Truth

- `src/shared/service.ts`: text-to-speech operator id, operator shape, and
  model metadata.
- `src/main/store/service.ts`: persisted `operator.textToSpeech` selection.
- `src/main/ipc/app-ipc.ts`: Settings IPC boundary for reading and saving
  operator selections.
- `src/renderer/src/pages/settings/pages/operators`: operator settings UI.
- `src/main/tasks`: background task handlers that can request TTS work.
- `src/main/cron`: schedules that can trigger TTS work through task handlers.

## Main Process Module

Text to speech should be a separated module in the main process. Renderer UI,
task handlers, and cron should not know which provider or model is used.

The main-process TTS module owns:

- Reading `operator.textToSpeech` from `StoreService`.
- Resolving the configured provider record from `StoreService`.
- Loading provider credentials, base URL, and provider configuration.
- Selecting the correct TTS runtime adapter for the provider and model.
- Normalizing provider-specific audio output into Friday audio result records.
- Keeping provider-specific voice, format, and streaming details inside
  adapters.

The product contract is `operator.textToSpeech`. Provider-specific code belongs
behind adapters inside the TTS module.

## Supported Providers And Models

Text to speech is not limited to a single provider or model. Any configured
provider can be used if Friday has a TTS adapter for it and the selected model
supports text-to-speech output.

The Settings model picker should show provider/model choices that have a TTS
capability. Saving the operator should validate capability compatibility, not a
hard-coded provider id.

Example TTS provider/model choices:

| Provider | Model id | Runtime style |
| --- | --- | --- |
| `elevenlabs` | `rachel-multilingual` | Hosted voice synthesis |
| `deepgram` | Provider model id | Hosted voice synthesis |
| `cartesia` | Provider model id | Hosted voice synthesis |
| `openai` | Provider model id | Hosted voice synthesis |
| Any TTS-capable provider | Provider model id | Streaming or batch |

Provider catalog and official provider links are maintained in
[providers.md](providers.md).

## Operator Selection

The text-to-speech operator is:

```ts
operator.textToSpeech
```

It stores a public provider record and a selected model:

```ts
{
	id: 'text-to-speech',
	name: 'Text to speech',
	docsPath: 'text-to-speech.md',
	status: 'pending-runtime',
	provider: {
		id: 'elevenlabs',
		name: 'ElevenLabs',
		baseUrl: 'https://api.elevenlabs.io/v1'
	},
	model: {
		id: 'rachel-multilingual',
		name: 'Rachel - multilingual'
	}
}
```

Credentials are not stored on the operator. The API key, base URL, and any
other private provider configuration are resolved from the stored provider
record when synthesis starts.

Save paths should enforce these rules:

- Provider id must reference a configured provider.
- Model id must be valid for that provider and support TTS.
- Saved model data is reduced to `{ id, name }`.

## Runtime Flow

Callers should pass text plus synthesis options. They should not pass provider
records, API keys, or base URLs.

Runtime startup:

1. A UI action, background task, or cron-triggered task requests TTS work.
2. The TTS module reads `operator.textToSpeech`.
3. It reads provider id and model id from the operator selection.
4. It loads credentials and provider configuration from
   `StoreService.getProviderById(providerId)`.
5. It creates the TTS adapter for the selected provider and model.
6. The adapter synthesizes audio and returns a normalized audio result.

If any required setting is missing, startup fails before text is sent to the
provider.

## Task And Cron Use

Immediate background work should use an operator-backed task handler such as
`text-to-speech.run`.

Scheduled work should use cron only for timing. When the cron job fires, it
should create or dispatch the same task type. Cron must not store provider
credentials or duplicate the selected model.

Recommended task input:

```json
{
	"text": "Read this summary aloud.",
	"voiceId": "optional-provider-voice-id",
	"format": "mp3"
}
```

The task handler validates the input and calls the TTS module. The TTS module
resolves provider and model from `operator.textToSpeech`.

## Failure Cases

Common startup failures:

- Text-to-speech operator is not configured.
- Saved provider is missing.
- Saved model is missing or does not support TTS for that provider.
- Provider credentials are missing.
- No TTS adapter exists for the selected provider/model pair.
- The provider request or streaming session fails.

