# OpenAI Models

This section documents the OpenAI models we plan to use. It is a model documentation map, not an implementation guide for API clients, authentication, prompts, or runtime wiring.

## Current Model Set

| Model type | Models | Documentation |
| --- | --- | --- |
| Large language models | `gpt-5.5`, `gpt-5.4-mini` | [openai/llm](llm/) |
| Text-to-speech | `gpt-4o-mini-tts`, `tts-1-hd` | [openai/tts](tts/) |
| Speech-to-text | `gpt-4o-transcribe`, `gpt-4o-mini-transcribe` | [openai/stt](stt/) |

## Documentation Notes

- Keep provider implementation details out of these pages.
- Put model-specific selection notes in the matching model folder.
- Mark uncertain model choices before treating them as planned usage.
