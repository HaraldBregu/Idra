# Video Creator

This document describes how Friday should use video generation models for
creating video output.

## Source Of Truth

- `src/shared/service.ts`: video creator operator id, operator shape, and model
  metadata.
- `src/main/store/service.ts`: persisted `operator.videoCreator` selection.
- `src/main/ipc/app-ipc.ts`: Settings IPC boundary for reading and saving
  operator selections.
- `src/renderer/src/pages/settings/pages/operators`: operator settings UI.
- `src/main/tasks`: background task handlers that can request video work.
- `src/main/cron`: schedules that can trigger video work through task handlers.

## Main Process Module

Video creation should be a separated module in the main process. Renderer UI,
task handlers, and cron should not know which provider or model is used.

The main-process video module owns:

- Reading `operator.videoCreator` from `StoreService`.
- Resolving the configured provider record from `StoreService`.
- Loading provider credentials, base URL, and provider configuration.
- Selecting the correct video runtime adapter for the provider and model.
- Normalizing provider-specific job responses into Friday video result records.
- Keeping provider-specific prompt, duration, reference asset, webhook, polling,
  and download details inside adapters.

The product contract is `operator.videoCreator`. Provider-specific code belongs
behind adapters inside the video module.

## Supported Providers And Models

Video creation is not limited to a single provider or model. Any configured
provider can be used if Friday has a video adapter for it and the selected
model supports video creation.

The Settings model picker should show provider/model choices that have a video
capability. Saving the operator should validate capability compatibility, not a
hard-coded provider id.

Example video provider/model choices:

| Provider | Model id | Runtime style |
| --- | --- | --- |
| `runway` | Provider model id | Hosted async video job |
| `kling` | Provider model id | Hosted async video job |
| `pika` | Provider model id | Hosted async video job |
| `luma` | Provider model id | Hosted async video job |
| `openai` | Provider model id | Hosted video generation |
| Any video-capable provider | Provider model id | Async or streaming |

Provider catalog and official provider links are maintained in
[providers.md](providers.md).

## Operator Selection

The video creator operator is:

```ts
operator.videoCreator
```

It stores a public provider record and a selected model:

```ts
{
	id: 'video-creator',
	name: 'Video creator',
	docsPath: 'video-creator.md',
	status: 'pending-runtime',
	provider: {
		id: 'runway',
		name: 'Runway',
		baseUrl: 'https://api.dev.runwayml.com/v1'
	},
	model: {
		id: 'provider-video-model',
		name: 'Provider video model'
	}
}
```

Credentials are not stored on the operator. The API key, base URL, webhook
secret, and any other private provider configuration are resolved from the
stored provider record when video work starts.

Save paths should enforce these rules:

- Provider id must reference a configured provider.
- Model id must be valid for that provider and support video work.
- Saved model data is reduced to `{ id, name }`.

## Runtime Flow

Callers should pass video instructions and asset references. They should not
pass provider records, API keys, base URLs, or webhook secrets.

Runtime startup:

1. A UI action, background task, or cron-triggered task requests video work.
2. The video module reads `operator.videoCreator`.
3. It reads provider id and model id from the operator selection.
4. It loads credentials and provider configuration from
   `StoreService.getProviderById(providerId)`.
5. It creates the video adapter for the selected provider and model.
6. The adapter starts the video job, polls or receives completion, and returns
   normalized video results.

If any required setting is missing, startup fails before prompt or asset data is
sent to the provider.

## Task And Cron Use

Immediate background work should use an operator-backed task handler such as
`video.create`.

Scheduled work should use cron only for timing. When the cron job fires, it
should create or dispatch the same task type. Cron must not store provider
credentials or duplicate the selected model.

Recommended task input:

```json
{
	"prompt": "Create a five second product reveal video.",
	"durationSeconds": 5,
	"aspectRatio": "16:9"
}
```

The task handler validates the input and calls the video module. The video
module resolves provider and model from `operator.videoCreator`.

## Failure Cases

Common startup failures:

- Video creator operator is not configured.
- Saved provider is missing.
- Saved model is missing or does not support video work for that provider.
- Provider credentials are missing.
- No video adapter exists for the selected provider/model pair.
- The provider job fails, times out, or returns no usable video asset.

