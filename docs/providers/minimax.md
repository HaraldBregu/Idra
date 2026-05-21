# MiniMax Provider

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

## Model Type Coverage

Official model references were checked in May 2026. MiniMax may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | MiniMax chat and reasoning model families, including the M-series models available through the MiniMax API. Official references: [MiniMax API overview](https://platform.minimax.io/docs/api-reference/api-overview). | Friday has an explicit default agent catalog for MiniMax. |
| Text-To-Speech Models | MiniMax speech synthesis and voice model families. Official references: [MiniMax API overview](https://platform.minimax.io/docs/api-reference/api-overview). | Friday exposes the shared `text-to-speech-provider-coming-soon` placeholder for MiniMax TTS. |
| Video Models | MiniMax video generation model families. Official references: [MiniMax API overview](https://platform.minimax.io/docs/api-reference/api-overview). | Friday exposes the shared `video-provider-coming-soon` placeholder for MiniMax video generation. |
| Music And Audio Models | MiniMax music and audio generation model families. Official references: [MiniMax API overview](https://platform.minimax.io/docs/api-reference/api-overview). | Friday exposes the shared `music-provider-coming-soon` placeholder for MiniMax sound generation. |

## Large Language Models

Official references: [MiniMax API overview](https://platform.minimax.io/docs/api-reference/api-overview).

Official model families: MiniMax chat and reasoning model families, including the M-series models available through the MiniMax API.

Friday status: Friday has an explicit default agent catalog for MiniMax.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `minimax-m2.7` | MiniMax M2.7 |

## Text-To-Speech Models

Official references: [MiniMax API overview](https://platform.minimax.io/docs/api-reference/api-overview).

Official model families: MiniMax speech synthesis and voice model families.

Friday status: Friday exposes the shared `text-to-speech-provider-coming-soon` placeholder for MiniMax TTS.

## Video Models

Official references: [MiniMax API overview](https://platform.minimax.io/docs/api-reference/api-overview).

Official model families: MiniMax video generation model families.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for MiniMax video generation.

## Music And Audio Models

Official references: [MiniMax API overview](https://platform.minimax.io/docs/api-reference/api-overview).

Official model families: MiniMax music and audio generation model families.

Friday status: Friday exposes the shared `music-provider-coming-soon` placeholder for MiniMax sound generation.

## Runtime Notes

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Pay-as-you-go API keys and Token Plan keys are separate.
- Friday does not save or pass reasoning effort for MiniMax.

## Example

```json
{
	"message": "Rewrite this customer response with a concise professional tone.",
	"providerId": "minimax",
	"model": "minimax-m2.7"
}
```

## Related Docs

- [Provider catalog](index.md)
