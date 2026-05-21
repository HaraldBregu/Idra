# Providers

This document describes how Friday should handle provider configuration, agent
model catalogs, reasoning effort, and provider-specific runtime behavior.

Provider credentials are stored on the provider record. Per-run overrides can
select `providerId`, `model`, and for OpenAI `effort`, but they do not accept
API keys or base URLs.

## Agent Model Selection

The settings path should return only models that are valid for the selected
provider. If a known provider has no main-agent model catalog, the model list
should be empty for the main Friday agent. Unknown provider ids should return
an unsupported-provider error.

When saving the main agent service:

- The provider id must be configured in the stored provider list.
- The model id must be one of the default models for providers that have a
  default catalog.
- OpenAI models store a validated `effort` value.
- Non-OpenAI models are saved as `{ id, name }`; any effort value is stripped.

The main run path resolves provider and model once per `AgentService.send`
call. The selected provider record supplies the API key and base URL, then
`makeProvider` creates the adapter.

## Reasoning Effort

Friday currently defines these reasoning effort values:

| Effort | Meaning in Friday |
| --- | --- |
| `none` | Ask for no explicit reasoning effort when the provider supports that value. |
| `minimal` | Lowest OpenAI-specific effort value except where a model excludes it. |
| `low` | Low reasoning effort. |
| `medium` | Default saved effort. |
| `high` | High reasoning effort. |
| `xhigh` | Extra-high Friday setting; mapped only where an adapter supports a reduced provider set. |

OpenAI effort handling:

- Default effort is `medium`.
- `gpt-5.4-mini` supports every effort except `minimal`.
- Other configured OpenAI models support `none`, `minimal`, `low`, `medium`,
  `high`, and `xhigh`.
- The OpenAI Responses adapter passes effort as `reasoning: { effort }`.

Non-OpenAI effort handling:

- The saved settings UI and `AgentService` currently pass effort only when the
  resolved provider id is `openai`.
- The Mistral adapter contains a mapping from Friday effort to Mistral effort:
  `none` maps to `none`, and `high` or `xhigh` map to `high`.
- The DeepSeek adapter can pass `reasoning_effort` for `low`, `medium`, and
  `high`, but the current main agent service does not resolve saved effort for
  DeepSeek.
- Anthropic, Qwen, and the generic OpenAI-compatible fallback path do not use
  Friday's saved effort value today.

## Runtime Adapter Behavior

| Provider id | Adapter | Runtime behavior |
| --- | --- | --- |
| `openai` | `OpenAIAdapter` | Uses the OpenAI Responses API through the OpenAI SDK. Sends `instructions`, `input`, function tools, `max_output_tokens`, `reasoning`, and includes encrypted reasoning content. |
| `anthropic` | `AnthropicAdapter` | Uses Anthropic Messages through the Anthropic SDK. Sends `system`, `messages`, `max_tokens`, and Anthropic tool schemas. |
| `mistral` | `MistralAdapter` | Uses Mistral chat streaming through `@mistralai/mistralai`. Normalizes `/v1` base URLs to the SDK server URL format and maps supported effort values. |
| `mistal` | `MistralAdapter` | Accepted as a compatibility typo alias. It is not a default provider id. |
| `deepseek` | `DeepSeekAdapter` | Uses OpenAI Chat Completions compatibility against `https://api.deepseek.com` unless the stored base URL overrides it. |
| `qwen` | `QwenAdapter` | Uses OpenAI Chat Completions compatibility against DashScope compatible mode unless the stored base URL overrides it. |
| all other ids | `OpenAIChatAdapter` | Uses OpenAI Chat Completions-compatible request shapes against the stored base URL. Only use these as main-agent providers when the target endpoint is actually compatible. |

All adapters emit the same provider-neutral event contract: message start,
text deltas, tool-call start and argument deltas, tool-call end, optional
reasoning items, and message end with usage.

## Run Examples

Main agent calls can override provider and model per run:

```ts
await agentService.send('Summarize the release notes.', 'main', {
	providerId: 'anthropic',
	model: 'claude-sonnet-4-6',
});
```

OpenAI runs can also override reasoning effort:

```ts
await agentService.send('Review this TypeScript diff.', 'main', {
	providerId: 'openai',
	model: 'gpt-5.5',
	effort: 'high',
});
```

The `agent.run` task input accepts the same fields:

```json
{
	"message": "Summarize the release notes.",
	"providerId": "mistral",
	"model": "mistral-large-latest"
}
```

Friday cron `agentTurn` jobs can also pass `providerId`, `model`, and
`thinking` in the job payload. `thinking` is converted to the send option
`effort`, but the main service currently applies that value only to OpenAI.

## Provider Catalog

### OpenAI

| Property | Value |
| --- | --- |
| Provider id | `openai` |
| Display name | OpenAI |
| Capabilities | Chat - Speech-to-text - Text-to-speech - Image - Video |
| Default base URL | `https://api.openai.com/v1` |
| Credential type | API key |
| Auth method | HTTP Bearer token |
| Recommended env vars | `OPENAI_API_KEY` |
| API-key link | [OpenAI API keys](https://platform.openai.com/api-keys) |
| Official docs | [OpenAI quickstart](https://developers.openai.com/api/docs/quickstart) |

Default agent models:

| Model id | Display name | Effort support |
| --- | --- | --- |
| `gpt-5.5` | GPT-5.5 | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`; default `medium` |
| `gpt-5.5-pro` | GPT-5.5 Pro | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`; default `medium` |
| `gpt-5.4` | GPT-5.4 | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`; default `medium` |
| `gpt-5.4-pro` | GPT-5.4 Pro | `none`, `minimal`, `low`, `medium`, `high`, `xhigh`; default `medium` |
| `gpt-5.4-mini` | GPT-5.4 Mini | `none`, `low`, `medium`, `high`, `xhigh`; default `medium` |

Runtime notes:

- Uses the native OpenAI Responses adapter.
- Function tools are sent as Responses API tools with `strict: false`.
- Reasoning items are preserved in the transcript as OpenAI reasoning blocks.
- Context overflow errors are normalized into `ContextOverflowError` for one
  compaction retry by the agent loop.

Example:

```json
{
	"message": "Plan the implementation and apply the smallest safe patch.",
	"providerId": "openai",
	"model": "gpt-5.5",
	"effort": "high"
}
```

### Anthropic

| Property | Value |
| --- | --- |
| Provider id | `anthropic` |
| Display name | Anthropic |
| Capabilities | Chat |
| Default base URL | `https://api.anthropic.com` |
| Credential type | API key |
| Auth method | `x-api-key` header plus `anthropic-version` header |
| Recommended env vars | `ANTHROPIC_API_KEY` |
| API-key link | [Anthropic API keys](https://console.anthropic.com/settings/keys) |
| Official docs | [Anthropic API overview](https://platform.claude.com/docs/en/api/overview) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `claude-opus-4-7` | Claude Opus 4.7 |
| `claude-opus-4-6` | Claude Opus 4.6 |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 |
| `claude-sonnet-4-5` | Claude Sonnet 4.5 |
| `claude-haiku-4-5` | Claude Haiku 4.5 |

Runtime notes:

- Uses the Anthropic Messages adapter.
- Tool calls are translated into Anthropic `tool_use` blocks.
- Tool results are sent back as user messages containing `tool_result` blocks.
- Friday does not save or pass reasoning effort for Anthropic.

Example:

```json
{
	"message": "Inspect the product spec and identify missing edge cases.",
	"providerId": "anthropic",
	"model": "claude-sonnet-4-6"
}
```

### Google DeepMind / Google

| Property | Value |
| --- | --- |
| Provider id | `google` |
| Display name | Google DeepMind / Google |
| Capabilities | Chat - Speech-to-text - Text-to-speech - Image - Video - Music |
| Default base URL | `https://generativelanguage.googleapis.com/v1beta/openai` |
| Credential type | Gemini API key / Google Cloud credentials depending on service |
| Auth method | API key parameter/header for Gemini Developer API; Google Cloud IAM/auth for Vertex/Cloud APIs |
| Recommended env vars | `GEMINI_API_KEY`, `GOOGLE_API_KEY` |
| API-key link | [Google AI Studio API keys](https://aistudio.google.com/app/apikey) |
| Official docs | [Gemini API key docs](https://ai.google.dev/gemini-api/docs/api-key) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `gemini-3.1-pro-preview` | Gemini 3.1 Pro Preview |
| `gemini-3-flash-preview` | Gemini 3 Flash Preview |
| `gemini-2.5-pro` | Gemini 2.5 Pro |
| `gemini-2.5-flash` | Gemini 2.5 Flash |
| `gemini-2.5-flash-lite` | Gemini 2.5 Flash-Lite |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- The configured base URL points at Google's OpenAI-compatible Gemini endpoint.
- Friday does not save or pass reasoning effort for Google.

Example:

```json
{
	"message": "Compare these two design alternatives.",
	"providerId": "google",
	"model": "gemini-2.5-pro"
}
```

### Meta

| Property | Value |
| --- | --- |
| Provider id | `meta` |
| Display name | Meta |
| Capabilities | Chat - Video |
| Default base URL | `https://ai.meta.com` |
| Credential type | Llama API key |
| Auth method | API key authentication |
| Recommended env vars | `LLAMA_API_KEY` |
| API-key link | [Meta Llama developer portal](https://llama.developer.meta.com/) |
| Official docs | [Meta Llama API keys](https://llama.developer.meta.com/docs/api-keys/) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `llama-4-maverick` | Llama 4 Maverick |
| `llama-4-scout` | Llama 4 Scout |
| `llama-3.3-70b` | Llama 3.3 70B |

Runtime notes:

- No dedicated Meta adapter is registered.
- `makeProvider` falls back to the generic OpenAI Chat Completions-compatible
  adapter for this id.
- Confirm that the configured endpoint is OpenAI-compatible before using Meta
  as the main agent provider.

Example:

```json
{
	"message": "Draft a concise architectural decision record.",
	"providerId": "meta",
	"model": "llama-4-maverick"
}
```

### xAI

| Property | Value |
| --- | --- |
| Provider id | `xai` |
| Display name | xAI |
| Capabilities | Chat - Realtime voice - Image - Video |
| Default base URL | `https://api.x.ai/v1` |
| Credential type | API key |
| Auth method | HTTP Bearer token |
| Recommended env vars | `XAI_API_KEY` |
| API-key link | [xAI console](https://console.x.ai/) |
| Official docs | [xAI quickstart](https://docs.x.ai/developers/quickstart) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `grok-4.3` | Grok 4.3 |
| `grok-4.3-fast` | Grok 4.3 Fast |
| `grok-code-fast` | Grok Code Fast |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Friday does not save or pass reasoning effort for xAI.

Example:

```json
{
	"message": "Explain the failing test and propose a direct fix.",
	"providerId": "xai",
	"model": "grok-code-fast"
}
```

### Mistral AI

| Property | Value |
| --- | --- |
| Provider id | `mistral` |
| Display name | Mistral AI |
| Capabilities | Chat - Speech-to-text - Text-to-speech |
| Default base URL | `https://api.mistral.ai/v1` |
| Credential type | API key |
| Auth method | HTTP Bearer token |
| Recommended env vars | `MISTRAL_API_KEY` |
| API-key link | [Mistral API keys](https://admin.mistral.ai/organization/api-keys) |
| Official docs | [Mistral quickstarts](https://docs.mistral.ai/getting-started/quickstarts) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `mistral-large-2512` | Mistral Large 3 |
| `mistral-large-latest` | Mistral Large Latest |
| `mistral-medium-2604` | Mistral Medium 3.5 |
| `mistral-medium-latest` | Mistral Medium Latest |
| `mistral-medium-2508` | Mistral Medium 3.1 |
| `mistral-small-2603` | Mistral Small 4 |
| `mistral-small-latest` | Mistral Small Latest |
| `ministral-14b-2512` | Ministral 3 14B |
| `ministral-14b-latest` | Ministral 3 14B Latest |
| `ministral-8b-2512` | Ministral 3 8B |
| `ministral-8b-latest` | Ministral 3 8B Latest |
| `ministral-3b-2512` | Ministral 3 3B |
| `ministral-3b-latest` | Ministral 3 3B Latest |
| `magistral-medium-2509` | Magistral Medium 1.2 |
| `magistral-medium-latest` | Magistral Medium Latest |

Runtime notes:

- Uses the dedicated Mistral adapter and Mistral SDK chat streaming.
- The adapter normalizes a base URL ending in `/v1` before passing it to the
  SDK.
- Tool calls are streamed with Mistral `toolCalls`.
- Adapter effort mapping exists for `none`, `high`, and `xhigh`, but the main
  agent service currently resolves effort only for OpenAI.

Example:

```json
{
	"message": "Implement the smallest change that satisfies this bug report.",
	"providerId": "mistral",
	"model": "mistral-large-latest"
}
```

### Cohere

| Property | Value |
| --- | --- |
| Provider id | `cohere` |
| Display name | Cohere |
| Capabilities | Chat - Speech-to-text |
| Default base URL | `https://api.cohere.com` |
| Credential type | API key |
| Auth method | Bearer/API key auth via official SDKs |
| Recommended env vars | `COHERE_API_KEY` |
| API-key link | [Cohere API keys](https://dashboard.cohere.com/api-keys) |
| Official docs | [Cohere API reference](https://docs.cohere.com/reference/about) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `command-a-03-2025` | Command A |
| `command-a-reasoning-08-2025` | Command A Reasoning |
| `command-a-vision-07-2025` | Command A Vision |
| `aya-vision` | Aya Vision |

Runtime notes:

- No dedicated Cohere adapter is registered.
- `makeProvider` falls back to the generic OpenAI Chat Completions-compatible
  adapter for this id.
- Confirm endpoint compatibility before using Cohere as the main agent
  provider.

Example:

```json
{
	"message": "Summarize the customer feedback by product area.",
	"providerId": "cohere",
	"model": "command-a-03-2025"
}
```

### DeepSeek

| Property | Value |
| --- | --- |
| Provider id | `deepseek` |
| Display name | DeepSeek |
| Capabilities | Chat |
| Default base URL | `https://api.deepseek.com` |
| Credential type | API key |
| Auth method | OpenAI-compatible Bearer token |
| Recommended env vars | `DEEPSEEK_API_KEY` |
| API-key link | [DeepSeek API keys](https://platform.deepseek.com/api_keys) |
| Official docs | [DeepSeek API docs](https://api-docs.deepseek.com/) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `deepseek-v4-pro` | DeepSeek V4-Pro |
| `deepseek-v4-flash` | DeepSeek V4-Flash |

Runtime notes:

- Uses the dedicated DeepSeek adapter, which extends the OpenAI
  Chat Completions-compatible adapter.
- The adapter defaults to `https://api.deepseek.com` when no stored base URL is
  supplied.
- It can pass `reasoning_effort` values `low`, `medium`, or `high` when effort
  reaches the adapter; the main agent service currently only resolves effort for
  OpenAI.

Example:

```json
{
	"message": "Analyze this regression and suggest a focused test.",
	"providerId": "deepseek",
	"model": "deepseek-v4-pro"
}
```

### Alibaba / Qwen / Wan

| Property | Value |
| --- | --- |
| Provider id | `qwen` |
| Display name | Alibaba / Qwen / Wan |
| Capabilities | Chat - Omni - Image - Video |
| Default base URL | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Credential type | Model Studio API key |
| Auth method | API key; OpenAI-compatible or DashScope SDK depending on endpoint |
| Recommended env vars | `DASHSCOPE_API_KEY`, `ALIBABA_CLOUD_API_KEY` |
| API-key link | [Alibaba Model Studio API keys](https://bailian.console.aliyun.com/?tab=api#/api-key) |
| Official docs | [Alibaba Model Studio API key docs](https://www.alibabacloud.com/help/en/model-studio/get-api-key) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `qwen3-max` | Qwen3-Max |
| `qwen3.5-plus` | Qwen3.5-Plus |
| `qwen3.5-flash` | Qwen3.5-Flash |
| `qwen3-coder-plus` | Qwen3-Coder-Plus |
| `qwq-plus` | QwQ-Plus |

Runtime notes:

- Uses the dedicated Qwen adapter, which extends the OpenAI
  Chat Completions-compatible adapter.
- The adapter defaults to DashScope international compatible mode.
- Friday does not save or pass reasoning effort for Qwen.

Example:

```json
{
	"message": "Refactor this parser without changing its public behavior.",
	"providerId": "qwen",
	"model": "qwen3-coder-plus"
}
```

### Moonshot AI / Kimi

| Property | Value |
| --- | --- |
| Provider id | `kimi` |
| Display name | Moonshot AI / Kimi |
| Capabilities | Chat |
| Default base URL | `https://api.moonshot.ai/v1` |
| Credential type | API key |
| Auth method | API key / OpenAI-compatible Bearer token |
| Recommended env vars | `MOONSHOT_API_KEY`, `KIMI_API_KEY` |
| API-key link | [Moonshot API keys](https://platform.moonshot.ai/console/api-keys) |
| Official docs | [Moonshot platform](https://platform.moonshot.ai/) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `kimi-k2.6` | Kimi K2.6 |
| `kimi-k2.5` | Kimi K2.5 |
| `kimi-k2` | Kimi K2 |
| `kimi-latest` | Kimi Latest |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Friday does not save or pass reasoning effort for Kimi.

Example:

```json
{
	"message": "Summarize this long document and preserve the action items.",
	"providerId": "kimi",
	"model": "kimi-latest"
}
```

### Z.ai / Zhipu AI

| Property | Value |
| --- | --- |
| Provider id | `zai` |
| Display name | Z.ai / Zhipu AI |
| Capabilities | Chat |
| Default base URL | `https://api.z.ai/api/paas/v4` |
| Credential type | API key |
| Auth method | API key / Bearer token depending on SDK/API |
| Recommended env vars | `ZHIPUAI_API_KEY`, `ZAI_API_KEY` |
| API-key link | [BigModel API keys](https://open.bigmodel.cn/usercenter/apikeys) |
| Official docs | [BigModel API docs](https://open.bigmodel.cn/dev/api) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `glm-5.1` | GLM-5.1 |
| `glm-5` | GLM-5 |
| `glm-4.6` | GLM-4.6 |
| `glm-4.5v` | GLM-4.5V |
| `glm-z1` | GLM-Z1 |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Friday does not save or pass reasoning effort for Z.ai.

Example:

```json
{
	"message": "Extract risks and assumptions from this project brief.",
	"providerId": "zai",
	"model": "glm-5.1"
}
```

### Baidu

| Property | Value |
| --- | --- |
| Provider id | `baidu` |
| Display name | Baidu |
| Capabilities | Chat - Omni - Image |
| Default base URL | `https://qianfan.baidubce.com/v2` |
| Credential type | Qianfan API key / access token credentials |
| Auth method | Qianfan API key or access-token flow depending on API generation |
| Recommended env vars | `QIANFAN_API_KEY`, `QIANFAN_SECRET_KEY`, `QIANFAN_ACCESS_KEY`, `QIANFAN_SECRET_ACCESS_KEY` |
| API-key link | [Baidu Qianfan application console](https://console.bce.baidu.com/qianfan/ais/console/applicationConsole/application) |
| Official docs | [Baidu Qianfan API docs](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `ernie-5.1` | ERNIE 5.1 |
| `ernie-5.0` | ERNIE 5.0 |
| `ernie-x1.1` | ERNIE X1.1 |
| `ernie-4.5` | ERNIE 4.5 |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Qianfan auth can involve key/secret or access-token management depending on
  the selected API path.
- Friday does not save or pass reasoning effort for Baidu.

Example:

```json
{
	"message": "Classify these support tickets and produce a short summary.",
	"providerId": "baidu",
	"model": "ernie-5.1"
}
```

### Tencent Hunyuan

| Property | Value |
| --- | --- |
| Provider id | `tencent-hunyuan` |
| Display name | Tencent Hunyuan |
| Capabilities | Chat - Image - Video - 3D |
| Default base URL | `https://hunyuan.tencent.com` |
| Credential type | Tencent Cloud SecretId/SecretKey or Hunyuan API key |
| Auth method | Tencent Cloud API 3.0 signature or Hunyuan API key depending on endpoint |
| Recommended env vars | `TENCENTCLOUD_SECRET_ID`, `TENCENTCLOUD_SECRET_KEY`, `HUNYUAN_API_KEY` |
| API-key link | [Tencent Cloud API keys](https://console.cloud.tencent.com/cam/capi) |
| Official docs | [Tencent Hunyuan docs](https://intl.cloud.tencent.com/ind/document/product/1290/79463) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `hy3-preview` | Hy3 Preview |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Tencent Cloud services often use signed SecretId/SecretKey requests rather
  than a single static API key.
- Friday does not save or pass reasoning effort for Tencent Hunyuan.

Example:

```json
{
	"message": "Create a short implementation outline for this feature.",
	"providerId": "tencent-hunyuan",
	"model": "hy3-preview"
}
```

### ByteDance Seed

| Property | Value |
| --- | --- |
| Provider id | `bytedance-seed` |
| Display name | ByteDance Seed |
| Capabilities | Chat - Image - Video - 3D |
| Default base URL | `https://ark.cn-beijing.volces.com/api/v3` |
| Credential type | BytePlus ModelArk API key |
| Auth method | API key / Bearer token |
| Recommended env vars | `ARK_API_KEY`, `BYTEPLUS_API_KEY` |
| API-key link | [BytePlus ModelArk API keys](https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey) |
| Official docs | [BytePlus ModelArk docs](https://docs.byteplus.com/en/docs/ModelArk/1399008) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `seed2.0-pro` | Seed2.0 Pro |
| `seed2.0-code` | Seed2.0 Code |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- The API-key docs note that the relevant ModelArk model service must be
  enabled.
- Friday does not save or pass reasoning effort for ByteDance Seed.

Example:

```json
{
	"message": "Generate a migration checklist for this module.",
	"providerId": "bytedance-seed",
	"model": "seed2.0-code"
}
```

### MiniMax

| Property | Value |
| --- | --- |
| Provider id | `minimax` |
| Display name | MiniMax |
| Capabilities | Chat - Text-to-speech - Video - Music |
| Default base URL | `https://api.minimax.io/v1` |
| Credential type | API key; Token Plan key is separate |
| Auth method | API key / Bearer token |
| Recommended env vars | `MINIMAX_API_KEY` |
| API-key link | [MiniMax interface keys](https://platform.minimax.io/user-center/basic-information/interface-key) |
| Official docs | [MiniMax API overview](https://platform.minimax.io/docs/api-reference/api-overview) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `minimax-m2.7` | MiniMax M2.7 |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Pay-as-you-go API keys and Token Plan keys are separate.
- Friday does not save or pass reasoning effort for MiniMax.

Example:

```json
{
	"message": "Rewrite this customer response with a concise professional tone.",
	"providerId": "minimax",
	"model": "minimax-m2.7"
}
```

### ElevenLabs

| Property | Value |
| --- | --- |
| Provider id | `elevenlabs` |
| Display name | ElevenLabs |
| Capabilities | Speech-to-text - Text-to-speech - Audio - Music |
| Default base URL | `https://api.elevenlabs.io/v1` |
| Credential type | API key |
| Auth method | `xi-api-key` header |
| Recommended env vars | `ELEVENLABS_API_KEY` |
| API-key link | [ElevenLabs API keys](https://elevenlabs.io/app/settings/api-keys) |
| Official docs | [ElevenLabs authentication docs](https://elevenlabs.io/docs/api-reference/authentication) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Module-specific model constants:

| Model id | Display name | Module |
| --- | --- | --- |
| `rachel-multilingual` | Rachel - multilingual | Text-to-speech |

Runtime notes:

- ElevenLabs is configured as the default text-to-speech provider constant.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "elevenlabs",
	"baseUrl": "https://api.elevenlabs.io/v1",
	"recommendedEnvVar": "ELEVENLABS_API_KEY",
	"textToSpeechModel": "rachel-multilingual"
}
```

### Deepgram

| Property | Value |
| --- | --- |
| Provider id | `deepgram` |
| Display name | Deepgram |
| Capabilities | Speech-to-text - Text-to-speech |
| Default base URL | `https://api.deepgram.com/v1` |
| Credential type | API key |
| Auth method | Token/API key auth |
| Recommended env vars | `DEEPGRAM_API_KEY` |
| API-key link | [Deepgram project keys](https://console.deepgram.com/project/keys) |
| Official docs | [Deepgram API key docs](https://developers.deepgram.com/docs/create-additional-api-keys) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Deepgram is present as a provider credential and capability entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "deepgram",
	"baseUrl": "https://api.deepgram.com/v1",
	"recommendedEnvVar": "DEEPGRAM_API_KEY"
}
```

### Cartesia

| Property | Value |
| --- | --- |
| Provider id | `cartesia` |
| Display name | Cartesia |
| Capabilities | Text-to-speech |
| Default base URL | `https://api.cartesia.ai` |
| Credential type | API key; admin API keys for key-management endpoints |
| Auth method | `Authorization: Bearer <api_key>` plus `Cartesia-Version` header |
| Recommended env vars | `CARTESIA_API_KEY` |
| API-key link | [Cartesia keys](https://play.cartesia.ai/keys) |
| Official docs | [Cartesia API conventions](https://docs.cartesia.ai/use-the-api/api-conventions) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Cartesia is present as a provider credential and capability entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "cartesia",
	"baseUrl": "https://api.cartesia.ai",
	"recommendedEnvVar": "CARTESIA_API_KEY"
}
```

### Black Forest Labs

| Property | Value |
| --- | --- |
| Provider id | `black-forest-labs` |
| Display name | Black Forest Labs |
| Capabilities | Image |
| Default base URL | `https://api.bfl.ai/v1` |
| Credential type | BFL API key |
| Auth method | API key authentication |
| Recommended env vars | `BFL_API_KEY` |
| API-key link | [BFL profile/API auth](https://api.us1.bfl.ai/auth/profile) |
| Official docs | [BFL docs](https://docs.bfl.ai/) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Black Forest Labs is present as an image-provider credential and capability
  entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "black-forest-labs",
	"baseUrl": "https://api.bfl.ai/v1",
	"recommendedEnvVar": "BFL_API_KEY"
}
```

### Midjourney

| Property | Value |
| --- | --- |
| Provider id | `midjourney` |
| Display name | Midjourney |
| Capabilities | Image - Video |
| Default base URL | `https://www.midjourney.com` |
| Credential type | No generally available official API key found |
| Auth method | None configured |
| Recommended env vars | None |
| API-key link | None configured |
| Official docs | [Midjourney help center](https://docs.midjourney.com/hc/en-us) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- The constants intentionally do not provide an official public API-key
  management link.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "midjourney",
	"baseUrl": "https://www.midjourney.com",
	"officialApiKeyManagement": false
}
```

### Adobe Firefly

| Property | Value |
| --- | --- |
| Provider id | `adobe-firefly` |
| Display name | Adobe Firefly |
| Capabilities | Image - Video - Audio |
| Default base URL | `https://firefly-api.adobe.io` |
| Credential type | Adobe Developer API key/client credentials plus access token |
| Auth method | Adobe API key + OAuth access token |
| Recommended env vars | `FIREFLY_SERVICES_CLIENT_ID`, `FIREFLY_SERVICES_CLIENT_SECRET`, `FIREFLY_SERVICES_ACCESS_TOKEN` |
| API-key link | [Adobe Developer Console](https://developer.adobe.com/console) |
| Official docs | [Firefly Services getting started](https://developer.adobe.com/firefly-services/docs/guides/get-started) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Firefly Services require Adobe Developer Console credentials and an access
  token; not just a static API key.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "adobe-firefly",
	"baseUrl": "https://firefly-api.adobe.io",
	"recommendedEnvVars": [
		"FIREFLY_SERVICES_CLIENT_ID",
		"FIREFLY_SERVICES_CLIENT_SECRET",
		"FIREFLY_SERVICES_ACCESS_TOKEN"
	]
}
```

### Kuaishou / Kling AI

| Property | Value |
| --- | --- |
| Provider id | `kling` |
| Display name | Kuaishou / Kling AI |
| Capabilities | Image - Video - Audio |
| Default base URL | `https://kling.ai` |
| Credential type | Access key and secret key |
| Auth method | Kling developer API authentication using access/secret credentials |
| Recommended env vars | `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` |
| API-key link | [Kling API keys](https://app.klingai.com/global/dev/account/apiKey) |
| Official docs | [Kling API overview](https://app.klingai.com/global/dev/document-api/quickStart/productIntroduction/overview) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Kling uses access/secret credentials in the configured metadata.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "kling",
	"baseUrl": "https://kling.ai",
	"recommendedEnvVars": ["KLING_ACCESS_KEY", "KLING_SECRET_KEY"]
}
```

### Runway

| Property | Value |
| --- | --- |
| Provider id | `runway` |
| Display name | Runway |
| Capabilities | Video |
| Default base URL | `https://api.dev.runwayml.com/v1` |
| Credential type | API key |
| Auth method | API key authentication |
| Recommended env vars | `RUNWAYML_API_SECRET`, `RUNWAY_API_KEY` |
| API-key link | [Runway developer portal](https://dev.runwayml.com/) |
| Official docs | [Runway API setup](https://docs.dev.runwayml.com/guides/setup/) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Runway is present as a video-provider credential and capability entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "runway",
	"baseUrl": "https://api.dev.runwayml.com/v1",
	"recommendedEnvVars": ["RUNWAYML_API_SECRET", "RUNWAY_API_KEY"]
}
```

### Luma AI

| Property | Value |
| --- | --- |
| Provider id | `luma` |
| Display name | Luma AI |
| Capabilities | Omni - Image - Video - 3D |
| Default base URL | `https://api.lumalabs.ai/dream-machine/v1` |
| Credential type | API key |
| Auth method | API key authentication |
| Recommended env vars | `LUMA_API_KEY` |
| API-key link | [Luma API keys](https://lumalabs.ai/dream-machine/api/keys) |
| Official docs | [Luma docs](https://docs.lumalabs.ai/docs/welcome) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `uni-1` | Uni-1 |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter if selected for
  the main agent.
- Confirm endpoint compatibility before using Luma as the main agent provider.
- Friday does not save or pass reasoning effort for Luma.

Example:

```json
{
	"message": "Describe a storyboard for this product demo.",
	"providerId": "luma",
	"model": "uni-1"
}
```

### Stability AI

| Property | Value |
| --- | --- |
| Provider id | `stability-ai` |
| Display name | Stability AI |
| Capabilities | Image - Video - Audio |
| Default base URL | `https://api.stability.ai/v2beta` |
| Credential type | API key |
| Auth method | `Authorization: Bearer <api_key>` |
| Recommended env vars | `STABILITY_API_KEY` |
| API-key link | [Stability API keys](https://platform.stability.ai/account/keys) |
| Official docs | [Stability getting started](https://platform.stability.ai/docs/getting-started) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Stability AI is present as an image/video/audio credential and capability
  entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "stability-ai",
	"baseUrl": "https://api.stability.ai/v2beta",
	"recommendedEnvVar": "STABILITY_API_KEY"
}
```

### Ideogram

| Property | Value |
| --- | --- |
| Provider id | `ideogram` |
| Display name | Ideogram |
| Capabilities | Image |
| Default base URL | `https://api.ideogram.ai` |
| Credential type | API key |
| Auth method | API key authentication |
| Recommended env vars | `IDEOGRAM_API_KEY` |
| API-key link | [Ideogram Manage API](https://ideogram.ai/manage-api) |
| Official docs | [Ideogram API setup](https://developer.ideogram.ai/ideogram-api/api-setup) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- Ideogram is present as an image-provider credential and capability entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "ideogram",
	"baseUrl": "https://api.ideogram.ai",
	"recommendedEnvVar": "IDEOGRAM_API_KEY"
}
```

### Pika

| Property | Value |
| --- | --- |
| Provider id | `pika` |
| Display name | Pika |
| Capabilities | Video |
| Default base URL | `https://pika.art` |
| Credential type | Fal API key for official Pika API access via Fal; third-party Pika keys also exist |
| Auth method | `FAL_KEY` / API key authentication |
| Recommended env vars | `FAL_KEY`, `PIKA_API_KEY` |
| API-key link | [Fal API keys](https://fal.ai/dashboard/keys) |
| Official docs | [Pika API](https://pika.art/api) |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- The constants point official Pika API access at Fal.ai.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "pika",
	"baseUrl": "https://pika.art",
	"recommendedEnvVars": ["FAL_KEY", "PIKA_API_KEY"]
}
```

### Suno

| Property | Value |
| --- | --- |
| Provider id | `suno` |
| Display name | Suno |
| Capabilities | Music |
| Default base URL | `https://suno.com` |
| Credential type | No generally available official Suno API key found |
| Auth method | None configured |
| Recommended env vars | None |
| API-key link | None configured |
| Official docs | None configured |

Default agent models:

None in `DEFAULT_AGENT_MODELS_BY_PROVIDER`.

Runtime notes:

- The constants intentionally do not link to third-party Suno API sites.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

Configuration shape example:

```json
{
	"id": "suno",
	"baseUrl": "https://suno.com",
	"officialApiKeyManagement": false
}
```

### Reka AI

| Property | Value |
| --- | --- |
| Provider id | `reka` |
| Display name | Reka AI |
| Capabilities | Chat |
| Default base URL | `https://api.reka.ai/v1` |
| Credential type | API key |
| Auth method | API key authentication |
| Recommended env vars | `REKA_API_KEY` |
| API-key link | [Reka platform](https://platform.reka.ai/) |
| Official docs | [Reka quickstart](https://docs.reka.ai/quickstart) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `reka-core` | Reka Core |
| `reka-flash` | Reka Flash |
| `reka-edge` | Reka Edge |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Confirm endpoint compatibility before using Reka as the main agent provider.
- Friday does not save or pass reasoning effort for Reka.

Example:

```json
{
	"message": "Review this incident report and list follow-up actions.",
	"providerId": "reka",
	"model": "reka-core"
}
```

### AI21 Labs

| Property | Value |
| --- | --- |
| Provider id | `ai21` |
| Display name | AI21 Labs |
| Capabilities | Chat |
| Default base URL | `https://api.ai21.com/studio/v1` |
| Credential type | API key |
| Auth method | API key authentication |
| Recommended env vars | `AI21_API_KEY` |
| API-key link | [AI21 Studio API keys](https://studio.ai21.com/account/api-keys) |
| Official docs | [AI21 create API key](https://docs.ai21.com/docs/create-api-key) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `jamba-large` | Jamba Large |
| `jamba-mini` | Jamba Mini |
| `jamba-1.5-large` | Jamba 1.5 Large |
| `jamba-1.5-mini` | Jamba 1.5 Mini |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Confirm endpoint compatibility before using AI21 as the main agent provider.
- Friday does not save or pass reasoning effort for AI21.

Example:

```json
{
	"message": "Turn this meeting transcript into decisions and owners.",
	"providerId": "ai21",
	"model": "jamba-large"
}
```

### Perplexity

| Property | Value |
| --- | --- |
| Provider id | `perplexity` |
| Display name | Perplexity |
| Capabilities | Research chat |
| Default base URL | `https://api.perplexity.ai` |
| Credential type | API key |
| Auth method | Bearer token |
| Recommended env vars | `PPLX_API_KEY`, `PERPLEXITY_API_KEY` |
| API-key link | [Perplexity API settings](https://www.perplexity.ai/settings/api) |
| Official docs | [Perplexity API key management](https://docs.perplexity.ai/docs/admin/api-key-management) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `sonar-reasoning-pro` | Sonar Reasoning Pro |
| `sonar-pro` | Sonar Pro |
| `sonar-deep-research` | Sonar Deep Research |
| `r1-1776` | R1 1776 |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- The provider is labeled as research chat in capabilities.
- Friday does not save or pass reasoning effort for Perplexity.

Example:

```json
{
	"message": "Research the latest context and cite what changed.",
	"providerId": "perplexity",
	"model": "sonar-pro"
}
```

### NVIDIA

| Property | Value |
| --- | --- |
| Provider id | `nvidia` |
| Display name | NVIDIA |
| Capabilities | Chat |
| Default base URL | `https://integrate.api.nvidia.com/v1` |
| Credential type | NVIDIA API key / NGC API key depending on service |
| Auth method | Bearer token for hosted NVIDIA NIM endpoints; NGC key for NGC services |
| Recommended env vars | `NVIDIA_API_KEY`, `NGC_API_KEY` |
| API-key link | [NVIDIA API keys](https://build.nvidia.com/settings/api-keys) |
| Official docs | [NVIDIA NIM getting started](https://docs.nvidia.com/nim/large-language-models/latest/getting-started.html) |

Default agent models:

| Model id | Display name |
| --- | --- |
| `nemotron-ultra-latest` | Nemotron Ultra / latest |
| `llama-nemotron-super` | Llama Nemotron Super |
| `llama-nemotron-nano` | Llama Nemotron Nano |
| `nemotron-vl` | Nemotron VL |

Runtime notes:

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Hosted NVIDIA NIM endpoints use NVIDIA API keys; self-hosted NIM deployments
  may use different auth.
- Friday does not save or pass reasoning effort for NVIDIA.

Example:

```json
{
	"message": "Explain the performance bottlenecks in this trace.",
	"providerId": "nvidia",
	"model": "nemotron-ultra-latest"
}
```

## Provider Lists Without Main-Agent Models

These providers are present in `DEFAULT_PROVIDERS` but do not have a default
entry in `DEFAULT_AGENT_MODELS_BY_PROVIDER`:

| Provider id | Purpose in constants |
| --- | --- |
| `elevenlabs` | Speech-to-text, text-to-speech, audio, and music credentials. |
| `deepgram` | Speech-to-text and text-to-speech credentials. |
| `cartesia` | Text-to-speech credentials. |
| `black-forest-labs` | Image generation credentials. |
| `midjourney` | Image and video provider placeholder with no configured official API-key link. |
| `adobe-firefly` | Adobe Firefly Services credentials. |
| `kling` | Kling image/video/audio credentials. |
| `runway` | Runway video credentials. |
| `stability-ai` | Stability image/video/audio credentials. |
| `ideogram` | Ideogram image credentials. |
| `pika` | Pika/Fal video credentials. |
| `suno` | Music provider placeholder with no configured official API-key link. |

Adding one of these providers to the main agent picker requires adding a
provider entry to `DEFAULT_AGENT_MODELS_BY_PROVIDER` and verifying the runtime
adapter can call that provider's chat endpoint.
