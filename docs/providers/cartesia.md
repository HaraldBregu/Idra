# Cartesia Provider

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

## Model Type Coverage

Official model references were checked in May 2026. Cartesia may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Text-To-Speech Models | Sonic 3, Sonic 3.5/latest, Sonic Turbo, Sonic multilingual, and dated Sonic snapshots. Official references: [Cartesia Sonic models](https://docs.cartesia.ai/build-with-cartesia/models/tts), [Cartesia model docs](https://docs.cartesia.ai/build-with-cartesia/models). | Friday exposes the shared `text-to-speech-provider-coming-soon` placeholder for Cartesia TTS. |

## Text-To-Speech Models

Official references: [Cartesia Sonic models](https://docs.cartesia.ai/build-with-cartesia/models/tts), [Cartesia model docs](https://docs.cartesia.ai/build-with-cartesia/models).

Official model families: Sonic 3, Sonic 3.5/latest, Sonic Turbo, Sonic multilingual, and dated Sonic snapshots.

Friday status: Friday exposes the shared `text-to-speech-provider-coming-soon` placeholder for Cartesia TTS.

## Runtime Notes

- Cartesia is present as a provider credential and capability entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

## Configuration Shape Example

```json
{
	"id": "cartesia",
	"baseUrl": "https://api.cartesia.ai",
	"recommendedEnvVar": "CARTESIA_API_KEY"
}
```

## Related Docs

- [Provider catalog](index.md)
