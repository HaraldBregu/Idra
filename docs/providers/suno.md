# Suno Provider

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

## Model Type Coverage

Official model references were checked in May 2026. Suno may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Music Models | Suno product docs describe song-generation model generations such as V3.5 and V4, but no generally available official public API docs or API-key page are configured in Friday. Official references: [Suno help center](https://help.suno.com/en/articles/2409473). | Friday exposes the shared `music-provider-coming-soon` placeholder for Suno music generation. |

## Music Models

Official references: [Suno help center](https://help.suno.com/en/articles/2409473).

Official model families: Suno product docs describe song-generation model generations such as V3.5 and V4, but no generally available official public API docs or API-key page are configured in Friday.

Friday status: Friday exposes the shared `music-provider-coming-soon` placeholder for Suno music generation.

## Runtime Notes

- The constants intentionally do not link to third-party Suno API sites.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

## Configuration Shape Example

```json
{
	"id": "suno",
	"baseUrl": "https://suno.com",
	"officialApiKeyManagement": false
}
```

## Related Docs

- [Provider catalog](index.md)
