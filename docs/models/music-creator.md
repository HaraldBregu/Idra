# Text To Audio

This document describes how Friday should use sound and music generation models
for creating audio output.

## Main Process Module

Sound creation should be a separated module in the main process. Renderer UI,
task handlers, and cron should not know which provider or model is used.

The main-process sound module owns:

- Reading its saved settings from `StoreService`.
- Resolving the configured provider record from `StoreService`.
- Loading provider credentials, base URL, and provider configuration.
- Selecting the correct sound runtime adapter for the provider and model.
- Normalizing provider-specific audio or music responses into Friday audio
  result records.
- Keeping provider-specific prompt, duration, stem, voice, style, polling, and
  download details inside adapters.

The sound module covers generated sound, audio, and music. Provider-specific
code belongs behind adapters inside the sound module.

## Service And Tool Exposure

Sound creation can be exposed as both a service and an LLM tool. The LLM tool
must stay a thin wrapper around the sound service and must not accept provider
credentials, base URLs, or raw provider records.

## Supported Providers And Models

Sound creation is not limited to a single provider or model. Any configured
provider can be used if Friday has a sound adapter for it and the selected
model supports audio or music generation.

The Settings model picker should show provider/model choices that have a music
or audio capability. Saving `textToSound` should validate capability
compatibility, not a hard-coded provider id.

Current catalog status:

- `MUSIC_CREATOR_MODELS_BY_PROVIDER` maps sound-capable providers to the
  placeholder `music-provider-coming-soon` model id.
- The operator remains `pending-runtime`; provider-specific sound adapters and
  a registered `sound.create` handler are not implemented yet.

Cataloged sound provider/model choices:

| Provider        | Model id                     | Runtime style             |
| --------------- | ---------------------------- | ------------------------- |
| `google`        | `music-provider-coming-soon` | Placeholder catalog entry |
| `minimax`       | `music-provider-coming-soon` | Placeholder catalog entry |
| `elevenlabs`    | `music-provider-coming-soon` | Placeholder catalog entry |
| `adobe-firefly` | `music-provider-coming-soon` | Placeholder catalog entry |
| `kling`         | `music-provider-coming-soon` | Placeholder catalog entry |
| `stability-ai`  | `music-provider-coming-soon` | Placeholder catalog entry |
| `suno`          | `music-provider-coming-soon` | Placeholder catalog entry |

Provider catalog and official provider links are maintained in
[providers.md](../providers/index.md).

## Module Settings

The sound module stores provider and model ids at the root `textToSound` key:

```ts
{
	providerId: 'stability-ai',
	modelId: 'provider-sound-model',
}
```

Credentials are not stored on `textToSound`. The API key, base URL, and
any other private provider configuration are resolved from the stored provider
record when sound work starts.

Save paths should enforce these rules:

- Provider id must reference a configured provider.
- Model id must be valid for that provider and support sound, audio, or music
  work.
- Saved model data is reduced to `{ id, name }`.

## Runtime Flow

Callers should pass sound instructions and asset references. They should not
pass provider records, API keys, or base URLs.

Runtime startup:

1. A UI action, background task, or cron-triggered task requests sound work.
2. The sound module reads `textToSound`.
3. It reads `providerId` and `modelId` from `textToSound`.
4. It loads credentials and provider configuration from
   `StoreService.getProviderById(providerId)`.
5. It creates the sound adapter for the selected provider and model.
6. The adapter generates audio or music and returns normalized audio results.

If any required setting is missing, startup fails before prompt or asset data is
sent to the provider.

## Task And Cron Use

Future immediate background work should use a module-backed task handler such
as `sound.create`.

Scheduled work should use the task scheduler only for timing. When the schedule
fires, it should create or dispatch the same task type. The schedule must not
store provider credentials or duplicate the selected model.

Recommended task input:

```json
{
	"prompt": "Create a short notification sound.",
	"durationSeconds": 4,
	"format": "wav"
}
```

When registered, the task handler validates the input and calls the sound
module. The sound module resolves provider and model from its saved settings.

## Failure Cases

Common startup failures:

- Sound module settings are not configured.
- Saved provider is missing.
- Saved model is missing or does not support sound work for that provider.
- Provider credentials are missing.
- No sound adapter exists for the selected provider/model pair.
- The provider job fails, times out, or returns no usable audio asset.
