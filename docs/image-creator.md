# Image Creator

This document describes how Friday should use image generation models for
creating and editing images.

## Source Of Truth

- `src/shared/service.ts`: image module id, current settings shape, and model
  metadata.
- `src/main/store/service.ts`: persisted image module selection.
- `src/main/ipc/app-ipc.ts`: Settings IPC boundary for reading and saving
  module selections.
- `src/main/tasks`: background task handlers that can request image work.
- `src/main/cron`: schedules that can trigger image work through task handlers.

## Main Process Module

Image creation should be a separated module in the main process. Renderer UI,
task handlers, and cron should not know which provider or model is used.

The main-process image module owns:

- Reading its saved settings from `StoreService`.
- Resolving the configured provider record from `StoreService`.
- Loading provider credentials, base URL, and provider configuration.
- Selecting the correct image runtime adapter for the provider and model.
- Normalizing provider-specific image responses into Friday image result
  records.
- Keeping provider-specific prompt, size, seed, edit, and polling details
  inside adapters.

Provider-specific code belongs behind adapters inside the image module.

## Service And Tool Exposure

Image creation can be exposed as both a service and an LLM tool. The LLM tool
must stay a thin wrapper around the image service and must not accept provider
credentials, base URLs, or raw provider records.

## Supported Providers And Models

Image creation is not limited to a single provider or model. Any configured
provider can be used if Friday has an image adapter for it and the selected
model supports image creation or editing.

The Settings model picker should show provider/model choices that have an image
capability. Saving the module selection should validate capability
compatibility, not a hard-coded provider id.

Example image provider/model choices:

| Provider | Model id | Runtime style |
| --- | --- | --- |
| `openai` | Provider model id | Hosted image generation |
| `google` | Provider model id | Hosted image generation |
| `black-forest-labs` | Provider model id | Hosted image generation |
| `stability-ai` | Provider model id | Hosted image generation |
| `ideogram` | Provider model id | Hosted image generation |
| Any image-capable provider | Provider model id | Generate or edit |

Provider catalog and official provider links are maintained in
[providers.md](providers.md).

## Module Settings

The image module stores a public provider record and a selected model:

```ts
{
	id: 'image-assistant',
	name: 'Image creator',
	docsPath: 'image-creator.md',
	status: 'pending-runtime',
	provider: {
		id: 'black-forest-labs',
		name: 'Black Forest Labs',
		baseUrl: 'https://api.bfl.ai/v1'
	},
	model: {
		id: 'provider-image-model',
		name: 'Provider image model'
	}
}
```

Credentials are not stored on the module selection. The API key, base URL, and
any other private provider configuration are resolved from the stored provider
record when image work starts.

Save paths should enforce these rules:

- Provider id must reference a configured provider.
- Model id must be valid for that provider and support image work.
- Saved model data is reduced to `{ id, name }`.

## Runtime Flow

Callers should pass image instructions and asset references. They should not
pass provider records, API keys, or base URLs.

Runtime startup:

1. A UI action, background task, or cron-triggered task requests image work.
2. The image module reads its saved settings.
3. It reads provider id and model id from the saved module settings.
4. It loads credentials and provider configuration from
   `StoreService.getProviderById(providerId)`.
5. It creates the image adapter for the selected provider and model.
6. The adapter generates or edits images and returns normalized image results.

If any required setting is missing, startup fails before prompt or asset data is
sent to the provider.

## Task And Cron Use

Immediate background work should use a module-backed task handler such as
`image.create`.

Scheduled work should use the task scheduler only for timing. When the schedule
fires, it should create or dispatch the same task type. The schedule must not
store provider credentials or duplicate the selected model.

Recommended task input:

```json
{
	"prompt": "Create a square product image on a white background.",
	"aspectRatio": "1:1",
	"count": 1
}
```

The task handler validates the input and calls the image module. The image
module resolves provider and model from its saved settings.

## Failure Cases

Common startup failures:

- Image module settings are not configured.
- Saved provider is missing.
- Saved model is missing or does not support image work for that provider.
- Provider credentials are missing.
- No image adapter exists for the selected provider/model pair.
- The provider job fails, times out, or returns no usable image asset.
