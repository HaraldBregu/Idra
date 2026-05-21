# Runway Provider

| Property | Value |
| --- | --- |
| Provider id | `runway` |
| Display name | Runway |
| Capabilities | Video |
| Default base URL | `https://api.dev.runwayml.com/v1` |
| Credential type | API key |
| Auth method | API key authentication |
| Recommended env vars | `RUNWAYML_API_SECRET`, `RUNWAY_API_KEY` |
| API-key link | [Runway developer portal](https://dev.runwayml.com/) |
| Official docs | [Runway API setup](https://docs.dev.runwayml.com/guides/setup/) |

## Model Type Coverage

Official model references were checked in May 2026. Runway may expose additional account-, region-, or preview-gated models; verify the linked provider docs before adding runtime adapters.

| Model type | Official provider coverage | Friday status |
| --- | --- | --- |
| Video Models | Runway video models including `gen4.5`, `gen4_turbo`, `gen4_aleph`, `act_two`, `seedance2`, and hosted Veo variants where available. Official references: [Runway available models](https://docs.dev.runwayml.com/guides/models), [Runway Seedance 2](https://docs.dev.runwayml.com/guides/seedance/). | Friday exposes the shared `video-provider-coming-soon` placeholder for Runway video generation. |
| Image Models | Runway image generation models such as `gen4_image`, `gen4_image_turbo`, and hosted partner image models. Official references: [Runway available models](https://docs.dev.runwayml.com/guides/models). | Friday does not currently mark Runway as image-capable in `DEFAULT_PROVIDERS`. |
| Audio Models | Runway API audio model entries include hosted ElevenLabs text-to-speech, text-to-sound, voice isolation, dubbing, and speech-to-speech models. Official references: [Runway available models](https://docs.dev.runwayml.com/guides/models). | Friday does not currently mark Runway as audio-capable in `DEFAULT_PROVIDERS`. |

## Video Models

Official references: [Runway available models](https://docs.dev.runwayml.com/guides/models), [Runway Seedance 2](https://docs.dev.runwayml.com/guides/seedance/).

Official model families: Runway video models including `gen4.5`, `gen4_turbo`, `gen4_aleph`, `act_two`, `seedance2`, and hosted Veo variants where available.

Friday status: Friday exposes the shared `video-provider-coming-soon` placeholder for Runway video generation.

## Image Models

Official references: [Runway available models](https://docs.dev.runwayml.com/guides/models).

Official model families: Runway image generation models such as `gen4_image`, `gen4_image_turbo`, and hosted partner image models.

Friday status: Friday does not currently mark Runway as image-capable in `DEFAULT_PROVIDERS`.

## Audio Models

Official references: [Runway available models](https://docs.dev.runwayml.com/guides/models).

Official model families: Runway API audio model entries include hosted ElevenLabs text-to-speech, text-to-sound, voice isolation, dubbing, and speech-to-speech models.

Friday status: Friday does not currently mark Runway as audio-capable in `DEFAULT_PROVIDERS`.

## Runtime Notes

- Runway is present as a video-provider credential and capability entry.
- It is not currently selectable as the main Friday agent provider through the
  default agent model picker.

## Configuration Shape Example

```json
{
	"id": "runway",
	"baseUrl": "https://api.dev.runwayml.com/v1",
	"recommendedEnvVars": ["RUNWAYML_API_SECRET", "RUNWAY_API_KEY"]
}
```

## Related Docs

- [Provider catalog](index.md)
