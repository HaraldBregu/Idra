# Reka AI Provider

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

## Model Type Coverage

Official model references were checked in May 2026. Reka AI may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Large Language Models | Reka Core, Reka Flash, Reka Edge, and dated model snapshots. Official references: [Reka models](https://docs.reka.ai/chat/models), [Reka list models guide](https://v0.docs.reka.ai/guides/005-listing-models.html). | Friday has an explicit default agent catalog for Reka. |

## Large Language Models

Official references: [Reka models](https://docs.reka.ai/chat/models), [Reka list models guide](https://v0.docs.reka.ai/guides/005-listing-models.html).

Official model families: Reka Core, Reka Flash, Reka Edge, and dated model snapshots.

Friday status: Friday has an explicit default agent catalog for Reka.

Friday default agent models:

| Model id | Display name |
| --- | --- |
| `reka-core` | Reka Core |
| `reka-flash` | Reka Flash |
| `reka-edge` | Reka Edge |

## Runtime Notes

- Uses the generic OpenAI Chat Completions-compatible adapter.
- Confirm endpoint compatibility before using Reka as the main agent provider.
- Friday does not save or pass reasoning effort for Reka.

## Example

```json
{
	"message": "Review this incident report and list follow-up actions.",
	"providerId": "reka",
	"model": "reka-core"
}
```

## Related Docs

- [Provider catalog](index.md)
