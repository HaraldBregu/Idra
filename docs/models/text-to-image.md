# Text To Image

This document describes how Friday should use text-to-image models for creating
and editing images from prompts and optional reference assets.

The module is named by product capability, not by a single provider or model.
The current persisted store key is still `imageCreator`; do not rename stored
settings without a migration.

## Main Process Module

Text-to-image should be a separated module in the main process. Renderer UI,
task handlers, cron, and LLM tool wrappers should not know which provider,
model, credential, or endpoint is used.

The main-process text-to-image module owns:

- Reading its saved settings from `StoreService`.
- Resolving the configured provider record from `StoreService`.
- Loading provider credentials, base URL, and provider configuration.
- Selecting the correct image runtime adapter for the provider and model.
- Normalizing provider-specific image responses into Friday image result
  records.
- Keeping provider-specific prompt, size, seed, edit, and polling details
  inside adapters.

Provider-specific code belongs behind adapters inside the module.

## Service And Tool Exposure

Text-to-image can be exposed as both a service and an LLM tool. The LLM tool
must stay a thin wrapper around the module service and must not accept provider
credentials, base URLs, or raw provider records.

Allowed caller input:

- Prompt and negative prompt text.
- Safe generation options such as aspect ratio, count, seed, and style hints.
- Safe references to input assets for image editing or guided generation.

Forbidden caller input:

- API keys, access tokens, OAuth credentials, or webhook secrets.
- Provider base URLs or raw provider records.
- Provider-specific request payloads that bypass the adapter contract.

## Supported Providers And Models

Text-to-image is not limited to a single provider or model. Any configured
provider can be used if Friday has an image adapter for it and the selected
model supports image creation, image editing, or image variation.

The Settings model picker should show provider/model choices that have an image
capability. Saving `imageCreator` should validate capability compatibility, not
a hard-coded provider id.

Current provider support is capability-backed. `IMAGE_CREATOR_MODELS` contains
the placeholder model id `image-provider-coming-soon` until provider-specific
image model catalogs and adapters are implemented.

Providers with image capability in the default provider catalog include:

| Provider id | Provider | Runtime style |
| --- | --- | --- |
| `openai` | OpenAI | Hosted image generation or editing |
| `google` | Google DeepMind / Google | Hosted image generation |
| `xai` | xAI | Hosted image generation |
| `qwen` | Alibaba / Qwen / Wan | Hosted image generation |
| `baidu` | Baidu | Hosted image generation |
| `tencent-hunyuan` | Tencent Hunyuan | Hosted image generation |
| `bytedance-seed` | ByteDance Seed | Hosted image generation |
| `black-forest-labs` | Black Forest Labs | Hosted image generation |
| `midjourney` | Midjourney | Hosted image generation |
| `adobe-firefly` | Adobe Firefly | Hosted image generation or editing |
| `kling` | Kuaishou / Kling AI | Hosted image generation |
| `luma` | Luma AI | Hosted image generation |
| `stability-ai` | Stability AI | Hosted image generation or editing |
| `ideogram` | Ideogram | Hosted image generation |

Provider credentials, base URLs, and official provider links are maintained in
[providers.md](../providers/index.md). The consolidated model overview is
maintained in the [model catalog](index.md).

## Module Settings

The current module stores provider and model ids at the root `imageCreator`
key:

```ts
{
	providerId: 'black-forest-labs',
	modelId: 'provider-text-to-image-model',
}
```

Credentials are not stored on `imageCreator`. The API key, base URL, and
any other private provider configuration are resolved from the stored provider
record when text-to-image work starts.

Save paths should enforce these rules:

- Provider id must reference a configured provider.
- Model id must be valid for that provider and support text-to-image work.
- Saved model data is reduced to `{ id, name }`.
- Provider capability alone is not enough at runtime; an adapter must exist for
  the selected provider/model pair before prompt or asset data is sent.

## Runtime Flow

Callers should pass prompt instructions and safe asset references. They should
not pass provider records, API keys, or base URLs.

Runtime startup:

1. A UI action, background task, or cron-triggered task requests text-to-image
   work.
2. The module reads `imageCreator`.
3. It reads `providerId` and `modelId` from `imageCreator`.
4. It loads credentials and provider configuration from
   `StoreService.getProviderById(providerId)`.
5. It creates the image adapter for the selected provider and model.
6. The adapter generates, edits, or varies images and returns normalized image
   results.

If any required setting is missing, startup fails before prompt or asset data is
sent to the provider.

## Output Contract

Adapters should normalize provider responses into Friday image result records.
The normalized result should identify generated assets without exposing provider
secrets or raw provider responses to the renderer.

Result records should include:

- Asset URL or local file reference after any required download step.
- MIME type and dimensions when known.
- Provider id and model id for auditability.
- Provider job id only when safe to store or display.
- Error details normalized into module-level failure messages.

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

- Text-to-image module settings are not configured.
- Saved provider is missing.
- Saved model is missing or does not support text-to-image work for that
  provider.
- Provider credentials are missing.
- No image adapter exists for the selected provider/model pair.
- The provider job fails, times out, or returns no usable image asset.
