# Store — Text To Sound

The `textToSound` root stores the active music or sound generation provider and model selection.

## Root

| Root | Owns |
| --- | --- |
| `textToSound` | Provider id, model id, reasoning effort, and sound generation module options. |

## Initial Value

Missing `textToSound` means no sound generation model has been selected.

## Shape

```json
{
  "providerId": "suno",
  "modelId": "chirp-v4",
  "options": {}
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `providerId` | string | Configured provider id. |
| `modelId` | string | Provider music or sound model id. |
| `effort` | string | Optional reasoning effort when supported. |
| `options` | object | Module-specific options. |

## Normalization

`providerId` is trimmed and lower-cased. `modelId` is trimmed. Invalid or missing provider/model pairs are ignored on reads. Writes reject models that are not allowed for the selected provider.

## Related Docs

- [Store](index.md)
- [Providers](../providers/index.md)
