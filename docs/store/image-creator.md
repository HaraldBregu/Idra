# Store — Image Creator

The `imageCreator` root stores the active image generation provider and model selection.

## Root

| Root | Owns |
| --- | --- |
| `imageCreator` | Provider id, model id, reasoning effort, and image generation module options. |

## Initial Value

Missing `imageCreator` means no image generation model has been selected.

## Shape

```json
{
  "providerId": "openai",
  "modelId": "gpt-image-1",
  "options": {}
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `providerId` | string | Configured provider id. |
| `modelId` | string | Provider image model id. |
| `effort` | string | Optional reasoning effort when supported. |
| `options` | object | Module-specific options. |

## Normalization

`providerId` is trimmed and lower-cased. `modelId` is trimmed. Invalid or missing provider/model pairs are ignored on reads. Writes reject models that are not allowed for the selected provider.

## Related Docs

- [Store](index.md)
- [Providers](../providers/index.md)
