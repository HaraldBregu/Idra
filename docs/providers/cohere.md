# Cohere Provider

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

## Model Type Coverage

Official model references were checked in May 2026. Cohere may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | Command, Command A, Command A Reasoning, Command A Vision, Command R, and Aya model families. Official references: [Cohere models](https://docs.cohere.com/docs/models). | Friday has an explicit default agent catalog for Cohere. |
| Speech-To-Text Models | Cohere Transcribe automatic speech recognition, including `cohere-transcribe-03-2026`. Official references: [Cohere Transcribe](https://docs.cohere.com/docs/transcribe), [Cohere models](https://docs.cohere.com/docs/models). | Friday exposes the shared `speech-to-text-provider-coming-soon` placeholder for Cohere STT. |
| Embedding And Rerank Models | Embed and Rerank model families for search, classification, clustering, and RAG. Official references: [Cohere models](https://docs.cohere.com/docs/models). | Friday has no default Cohere embedding or rerank catalog yet. |

## Large Language Models

Official references: [Cohere models](https://docs.cohere.com/docs/models).

Official model families: Command, Command A, Command A Reasoning, Command A Vision, Command R, and Aya model families.

Friday status: Friday has an explicit default agent catalog for Cohere.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `command-a-03-2025` | Command A |
| `command-a-reasoning-08-2025` | Command A Reasoning |
| `command-a-vision-07-2025` | Command A Vision |
| `aya-vision` | Aya Vision |

## Speech-To-Text Models

Official references: [Cohere Transcribe](https://docs.cohere.com/docs/transcribe), [Cohere models](https://docs.cohere.com/docs/models).

Official model families: Cohere Transcribe automatic speech recognition, including `cohere-transcribe-03-2026`.

Friday status: Friday exposes the shared `speech-to-text-provider-coming-soon` placeholder for Cohere STT.

Documented provider model ids:

| Model id | Display name | Runtime style |
| --- | --- | --- |
| `cohere-transcribe-03-2026` | Cohere Transcribe | File transcription |

## Embedding And Rerank Models

Official references: [Cohere models](https://docs.cohere.com/docs/models).

Official model families: Embed and Rerank model families for search, classification, clustering, and RAG.

Friday status: Friday has no default Cohere embedding or rerank catalog yet.

## Runtime Notes

- No dedicated Cohere adapter is registered.
- `makeProvider` falls back to the generic OpenAI Chat Completions-compatible
  adapter for this id.
- Confirm endpoint compatibility before using Cohere as the main agent
  provider.

## Example

```json
{
	"message": "Summarize the customer feedback by product area.",
	"providerId": "cohere",
	"model": "command-a-03-2025"
}
```

## Related Docs

- [Provider catalog](index.md)
