# Text To Speech

This document describes how Friday should use text-to-speech models for spoken
audio output.

## Main Process Module

Text to speech should be a separated module in the main process. Renderer UI,
task handlers, and cron should not know which provider or model is used.

The main-process TTS module owns:

- Reading its saved settings from `StoreService`.
- Resolving the configured provider record from `StoreService`.
- Loading provider credentials, base URL, and provider configuration.
- Selecting the correct TTS runtime adapter for the provider and model.
- Normalizing provider-specific audio output into Friday audio result records.
- Keeping provider-specific voice, format, and streaming details inside
  adapters.

Provider-specific code belongs behind adapters inside the TTS module.

## Service And Tool Exposure

Text to speech can be exposed as both a service and an LLM tool. The LLM tool
must stay a thin wrapper around the TTS service and must not accept provider
credentials, base URLs, or raw provider records.

## Supported Providers And Models

Text to speech is not limited to a single provider or model. Any configured
provider can be used if Friday has a TTS adapter for it and the selected model
supports text-to-speech output.

The Settings model picker should show provider/model choices that have a TTS
capability. Saving `textToSpeech` should validate capability compatibility, not
a hard-coded provider id.

Current catalog status:

- `elevenlabs` has the concrete `rachel-multilingual` model entry.
- Other text-to-speech capable providers use the placeholder
  `text-to-speech-provider-coming-soon` model id.
- The operator remains `pending-runtime`; provider-specific TTS adapters still
  need to validate model, voice, format, and streaming compatibility before
  text is sent to a provider.

Cataloged TTS provider/model choices:

| Provider | Model id | Runtime style |
| --- | --- | --- |
| `elevenlabs` | `rachel-multilingual` | Hosted voice synthesis |
| `openai` | `text-to-speech-provider-coming-soon` | Placeholder catalog entry |
| `google` | `text-to-speech-provider-coming-soon` | Placeholder catalog entry |
| `mistral` | `text-to-speech-provider-coming-soon` | Placeholder catalog entry |
| `minimax` | `text-to-speech-provider-coming-soon` | Placeholder catalog entry |
| `deepgram` | `text-to-speech-provider-coming-soon` | Placeholder catalog entry |
| `cartesia` | `text-to-speech-provider-coming-soon` | Placeholder catalog entry |

Provider catalog and official provider links are maintained in
[providers.md](../providers/index.md).

## Module Settings

The text-to-speech module stores provider and model ids at the root
`textToSpeech` key:

```ts
{
	providerId: 'elevenlabs',
	modelId: 'rachel-multilingual',
}
```

Credentials are not stored on `textToSpeech`. The API key, base URL, and
any other private provider configuration are resolved from the stored provider
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
2. The TTS module reads `textToSpeech`.
3. It reads `providerId` and `modelId` from `textToSpeech`.
4. It loads credentials and provider configuration from
   `StoreService.getProviderById(providerId)`.
5. It creates the TTS adapter for the selected provider and model.
6. The adapter synthesizes audio and returns a normalized audio result.

If any required setting is missing, startup fails before text is sent to the
provider.

## Task And Cron Use

Immediate background work should use a module-backed task handler such as
`text-to-speech.run`.

Scheduled work should use the task scheduler only for timing. When the schedule
fires, it should create or dispatch the same task type. The schedule must not
store provider credentials or duplicate the selected model.

Recommended task input:

```json
{
	"text": "Read this summary aloud.",
	"voiceId": "optional-provider-voice-id",
	"format": "mp3"
}
```

The task handler validates the input and calls the TTS module. The TTS module
resolves provider and model from its saved settings.

## Failure Cases

Common startup failures:

- Text-to-speech module settings are not configured.
- Saved provider is missing.
- Saved model is missing or does not support TTS for that provider.
- Provider credentials are missing.
- No TTS adapter exists for the selected provider/model pair.
- The provider request or streaming session fails.
