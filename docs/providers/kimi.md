# Moonshot AI / Kimi Provider

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

## Model Type Coverage

Official model references were checked in May 2026. Moonshot AI / Kimi may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | Kimi K2.6, Kimi K2.5, Kimi K2, Kimi thinking, Kimi vision, and official Kimi tool-capable model variants. Official references: [Kimi API docs](https://platform.moonshot.ai/docs/overview), [Kimi platform models](https://platform.moonshot.ai/), [Kimi thinking models](https://platform.moonshot.ai/docs/guide/use-kimi-k2-thinking-model.en-US). | Friday has an explicit default agent catalog for Kimi. |
| Vision Models | Kimi K2.5 supports text and visual input for multimodal understanding. Official references: [Kimi K2.5 quickstart](https://platform.moonshot.ai/docs/guide/kimi-k2-5-quickstart), [Kimi vision guide](https://platform.moonshot.ai/docs/guide/use-kimi-vision-model). | Friday does not have a separate Kimi vision module catalog. |

## Large Language Models

Official references: [Kimi API docs](https://platform.moonshot.ai/docs/overview), [Kimi platform models](https://platform.moonshot.ai/), [Kimi thinking models](https://platform.moonshot.ai/docs/guide/use-kimi-k2-thinking-model.en-US).

Official model families: Kimi K2.6, Kimi K2.5, Kimi K2, Kimi thinking, Kimi vision, and official Kimi tool-capable model variants.

Friday status: Friday has an explicit default agent catalog for Kimi.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `kimi-k2.6` | Kimi K2.6 |
| `kimi-k2.5` | Kimi K2.5 |
| `kimi-k2` | Kimi K2 |
| `kimi-latest` | Kimi Latest |

## Vision Models

Official references: [Kimi K2.5 quickstart](https://platform.moonshot.ai/docs/guide/kimi-k2-5-quickstart), [Kimi vision guide](https://platform.moonshot.ai/docs/guide/use-kimi-vision-model).

Official model families: Kimi K2.5 supports text and visual input for multimodal understanding.

Friday status: Friday does not have a separate Kimi vision module catalog.

## Runtime Notes

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Friday does not save or pass reasoning effort for Kimi.

## Example

```json
{
	"message": "Summarize this long document and preserve the action items.",
	"providerId": "kimi",
	"model": "kimi-latest"
}
```

## Related Docs

- [Provider catalog](index.md)
