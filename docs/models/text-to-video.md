# Text To Video

This document describes how Friday should use text-to-video models for creating
video output from prompts and optional reference assets.

## Main Process Module

Text-to-video should be a separated module in the main process. Renderer UI,
task handlers, and cron should not know which provider or model is used.

The main-process text-to-video module owns:

- Reading its saved settings from `StoreService`.
- Resolving the configured provider record from `StoreService`.
- Loading provider credentials, base URL, and provider configuration.
- Selecting the correct video runtime adapter for the provider and model.
- Normalizing provider-specific job responses into Friday video result records.
- Keeping provider-specific prompt, duration, reference asset, webhook, polling,
  and download details inside adapters.

Provider-specific code belongs behind adapters inside the video module.

## Service And Tool Exposure

Text-to-video can be exposed as both a service and an LLM tool. The LLM tool
must stay a thin wrapper around the video service and must not accept provider
credentials, base URLs, webhook secrets, or raw provider records.

## Supported Providers And Models

Text-to-video is not limited to a single provider or model. Any configured
provider can be used if Friday has a video adapter for it and the selected
model supports text-to-video generation.

The Settings model picker should show provider/model choices that have a video
capability. Saving `textToVideo` should validate capability compatibility, not
a hard-coded provider id.

Current catalog status:

- `TEXT_TO_VIDEO_MODELS_BY_PROVIDER` maps video-capable providers to the
  placeholder `video-provider-coming-soon` model id.
- The operator remains `pending-runtime`; provider-specific video adapters and
  a registered `video.create` handler are not implemented yet.

Cataloged video provider/model choices:

| Provider | Model id | Runtime style |
| --- | --- | --- |
| `openai` | `video-provider-coming-soon` | Placeholder catalog entry |
| `google` | `video-provider-coming-soon` | Placeholder catalog entry |
| `meta` | `video-provider-coming-soon` | Placeholder catalog entry |
| `xai` | `video-provider-coming-soon` | Placeholder catalog entry |
| `qwen` | `video-provider-coming-soon` | Placeholder catalog entry |
| `tencent-hunyuan` | `video-provider-coming-soon` | Placeholder catalog entry |
| `bytedance-seed` | `video-provider-coming-soon` | Placeholder catalog entry |
| `minimax` | `video-provider-coming-soon` | Placeholder catalog entry |
| `midjourney` | `video-provider-coming-soon` | Placeholder catalog entry |
| `adobe-firefly` | `video-provider-coming-soon` | Placeholder catalog entry |
| `kling` | `video-provider-coming-soon` | Placeholder catalog entry |
| `runway` | `video-provider-coming-soon` | Placeholder catalog entry |
| `luma` | `video-provider-coming-soon` | Placeholder catalog entry |
| `stability-ai` | `video-provider-coming-soon` | Placeholder catalog entry |
| `pika` | `video-provider-coming-soon` | Placeholder catalog entry |

Provider catalog and official provider links are maintained in
[providers.md](../providers/index.md).

## Module Settings

The text-to-video module stores provider and model ids at the root
`textToVideo` key:

```ts
{
	providerId: 'runway',
	modelId: 'provider-video-model',
}
```

Credentials are not stored on `textToVideo`. The API key, base URL, webhook
secret, and any other private provider configuration are resolved from the
stored provider record when text-to-video work starts.

Save paths should enforce these rules:

- Provider id must reference a configured provider.
- Model id must be valid for that provider and support video work.
- Saved model data is reduced to `{ id, name }`.

## Runtime Flow

Callers should pass video instructions and asset references. They should not
pass provider records, API keys, base URLs, or webhook secrets.

Runtime startup:

1. A UI action, background task, or cron-triggered task requests video work.
2. The video module reads `textToVideo`.
3. It reads `providerId` and `modelId` from `textToVideo`.
4. It loads credentials and provider configuration from
   `StoreService.getProviderById(providerId)`.
5. It creates the video adapter for the selected provider and model.
6. The adapter starts the video job, polls or receives completion, and returns
   normalized video results.

If any required setting is missing, startup fails before prompt or asset data is
sent to the provider.

## Task And Cron Use

Future immediate background work should use a module-backed task handler such
as `video.create`.

Scheduled work should use the task scheduler only for timing. When the schedule
fires, it should create or dispatch the same task type. The schedule must not
store provider credentials or duplicate the selected model.

Recommended task input:

```json
{
	"prompt": "Create a five second product reveal video.",
	"durationSeconds": 5,
	"aspectRatio": "16:9"
}
```

When registered, the task handler validates the input and calls the video
module. The video module resolves provider and model from its saved settings.

## Failure Cases

Common startup failures:

- Video module settings are not configured.
- Saved provider is missing.
- Saved model is missing or does not support video work for that provider.
- Provider credentials are missing.
- No video adapter exists for the selected provider/model pair.
- The provider job fails, times out, or returns no usable video asset.
