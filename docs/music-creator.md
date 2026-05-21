# Sound / Music Creator

This document describes how Friday should use sound and music generation models
for creating audio output.

## Source Of Truth

- `src/shared/service.ts`: music creator operator id, operator shape, and model
  metadata.
- `src/main/store/service.ts`: persisted `operator.musicCreator` selection.
- `src/main/ipc/app-ipc.ts`: Settings IPC boundary for reading and saving
  operator selections.
- `src/renderer/src/pages/settings/pages/operators`: operator settings UI.
- `src/main/tasks`: background task handlers that can request sound work.
- `src/main/cron`: schedules that can trigger sound work through task handlers.

## Main Process Module

Sound creation should be a separated module in the main process. Renderer UI,
task handlers, and cron should not know which provider or model is used.

The main-process sound module owns:

- Reading `operator.musicCreator` from `StoreService`.
- Resolving the configured provider record from `StoreService`.
- Loading provider credentials, base URL, and provider configuration.
- Selecting the correct sound runtime adapter for the provider and model.
- Normalizing provider-specific audio or music responses into Friday audio
  result records.
- Keeping provider-specific prompt, duration, stem, voice, style, polling, and
  download details inside adapters.

The product contract is `operator.musicCreator`, which covers generated sound,
audio, and music. Provider-specific code belongs behind adapters inside the
sound module.

## Supported Providers And Models

Sound creation is not limited to a single provider or model. Any configured
provider can be used if Friday has a sound adapter for it and the selected
model supports audio or music generation.

The Settings model picker should show provider/model choices that have a music
or audio capability. Saving the operator should validate capability
compatibility, not a hard-coded provider id.

Example sound provider/model choices:

| Provider | Model id | Runtime style |
| --- | --- | --- |
| `google` | Provider model id | Hosted music or audio generation |
| `minimax` | Provider model id | Hosted music or audio generation |
| `elevenlabs` | Provider model id | Hosted audio generation |
| `stability-ai` | Provider model id | Hosted audio generation |
| `suno` | Provider model id | Hosted music generation |
| Any sound-capable provider | Provider model id | Async or streaming |

Provider catalog and official provider links are maintained in
[providers.md](providers.md).

## Operator Selection

The sound creator operator is currently stored as:

```ts
operator.musicCreator
```

It stores a public provider record and a selected model:

```ts
{
	id: 'music-creator',
	name: 'Sound / music creator',
	docsPath: 'music-creator.md',
	status: 'pending-runtime',
	provider: {
		id: 'stability-ai',
		name: 'Stability AI',
		baseUrl: 'https://api.stability.ai/v2beta'
	},
	model: {
		id: 'provider-sound-model',
		name: 'Provider sound model'
	}
}
```

Credentials are not stored on the operator. The API key, base URL, and any
other private provider configuration are resolved from the stored provider
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
2. The sound module reads `operator.musicCreator`.
3. It reads provider id and model id from the operator selection.
4. It loads credentials and provider configuration from
   `StoreService.getProviderById(providerId)`.
5. It creates the sound adapter for the selected provider and model.
6. The adapter generates audio or music and returns normalized audio results.

If any required setting is missing, startup fails before prompt or asset data is
sent to the provider.

## Task And Cron Use

Immediate background work should use an operator-backed task handler such as
`sound.create`.

Scheduled work should use cron only for timing. When the cron job fires, it
should create or dispatch the same task type. Cron must not store provider
credentials or duplicate the selected model.

Recommended task input:

```json
{
	"prompt": "Create a short notification sound.",
	"durationSeconds": 4,
	"format": "wav"
}
```

The task handler validates the input and calls the sound module. The sound
module resolves provider and model from `operator.musicCreator`.

## Failure Cases

Common startup failures:

- Sound creator operator is not configured.
- Saved provider is missing.
- Saved model is missing or does not support sound work for that provider.
- Provider credentials are missing.
- No sound adapter exists for the selected provider/model pair.
- The provider job fails, times out, or returns no usable audio asset.

