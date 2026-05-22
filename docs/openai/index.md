# OpenAI Models

This section documents the OpenAI models we plan to use. It is a model documentation map, not an implementation guide for API clients, authentication, prompts, or runtime wiring.

## Model Areas

| Area | Folder | Purpose |
| --- | --- | --- |
| Large language models | [llm](llm/) | Text reasoning, chat, tool use, and structured output model choices. |
| Text-to-speech | [tts](tts/) | Speech generation model choices and audio quality notes. |
| Speech-to-text | [stt](stt/) | Transcription and speech recognition model choices. |

## Current Model Set

| Area | Models |
| --- | --- |
| Large language models | `gpt-5.5`, `gpt-5.4-mini` |
| Text-to-speech | `gpt-4o-mini-tts`, `tts-1-hd` |
| Speech-to-text | `gpt-4o-transcribe`, `gpt-4o-mini-transcribe` |

## Documentation Notes

- Keep provider implementation details out of these pages.
- Put model-specific selection notes in the matching model folder.
- Mark uncertain model choices before treating them as planned usage.
