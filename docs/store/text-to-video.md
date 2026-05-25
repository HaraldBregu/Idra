# Store — Text To Video

The `textToVideo` root stores the active video generation provider and model selection.

## Root

| Root | Owns |
| --- | --- |
| `textToVideo` | Provider id, model id, reasoning effort, and video generation module options. |

## Initial Value

Missing `textToVideo` means no video generation model has been selected.

## Shape

```json
{
  "providerId": "runway",
  "modelId": "gen4",
  "options": {}
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `providerId` | string | Configured provider id. |
| `modelId` | string | Provider video model id. |
| `effort` | string | Optional reasoning effort when supported. |
| `options` | object | Module-specific options. |

## Normalization

`providerId` is trimmed and lower-cased. `modelId` is trimmed. Invalid or missing provider/model pairs are ignored on reads. Writes reject models that are not allowed for the selected provider.

## Related Docs

- [Store](index.md)
- [Providers](../providers/index.md)
