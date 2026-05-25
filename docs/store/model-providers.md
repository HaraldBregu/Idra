# Store — Model Providers

The `modelProviders` root stores configured model provider records. The provider store uses it to resolve provider credentials and base URLs for model modules.

## Root

| Root | Owns |
| --- | --- |
| `modelProviders` | Provider ids, display names, base URLs, and API keys. |

## Initial Value

Missing `modelProviders` is read as an empty array.

```json
[]
```

## Shape

Each entry has these fields:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | Provider id. Stored lower-case. |
| `name` | string | Display name. |
| `baseUrl` | string | Provider API base URL. |
| `apiKey` | string | Provider credential. |

## Normalization

Provider ids are trimmed and lower-cased. String fields are trimmed. Entries without `id`, `name`, or `baseUrl` are ignored. Reads merge stored records with matching default provider catalog metadata when available.

## Related Docs

- [Store](index.md)
- [Providers](../providers/index.md)
