# Google DeepMind / Google LLM Provider

| Property | Value |
| --- | --- |
| Provider id | `google` |
| Provider doc | [Google provider](../providers/google.md) |
| Default base URL | `https://generativelanguage.googleapis.com/v1beta/openai` |
| Runtime adapter | `OpenAIChatAdapter` |
| Provider API style | OpenAI-compatible Chat Completions |

## Catalog Models

| Model id | What Friday uses it for |
| --- | --- |
| `gemini-3.1-pro-preview` | Main assistant and agent task turns |
| `gemini-3.1-flash-lite` | Main assistant and agent task turns where a lighter Gemini model is selected |

## What Friday Uses

Friday treats Google LLMs as OpenAI-compatible chat models. It sends the selected
model id, converted chat messages, selected tools as Chat Completions function
tools, `tool_choice: auto` when tools are available, `max_tokens`, streaming,
and usage streaming options.

The shared chat adapter maps streamed text, tool calls, tool argument deltas,
usage, and stop reasons back to Friday.

## Not Used Here

This LLM path does not use Google image, video, live audio, text-to-speech, or
music models.

