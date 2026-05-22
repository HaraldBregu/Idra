# Cartesia Models

This section documents Cartesia models.

## Provider Details

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

## Current Model Set

| Model type | Models | Documentation |
| --- | --- | --- |
| Text-to-speech | `sonic-3.5`, `sonic-3` | [cartesia/tts](tts/index) |
