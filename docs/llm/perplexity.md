# Perplexity Research Chat Provider

| Property | Value |
| --- | --- |
| Provider id | `perplexity` |
| Provider doc | [Perplexity provider](../providers/perplexity.md) |
| Default base URL | `https://api.perplexity.ai` |
| Runtime adapter | `OpenAIChatAdapter` |
| Provider API style | OpenAI-compatible Chat Completions for research-chat models |

## Catalog Models

| Model id | What Friday uses it for |
| --- | --- |
| `sonar-deep-research` | Research-oriented assistant and agent task turns |
| `sonar-reasoning-pro` | Research-oriented assistant and agent task turns |
| `sonar-pro` | Research-oriented assistant and agent task turns |
| `sonar` | Research-oriented assistant and agent task turns |

## What Friday Uses

Perplexity models live in Friday's `research-chat` catalog, but they are merged
into the default agent model catalog. Friday can use them for agent runs when a
Perplexity provider record and one of these model ids are selected.

The adapter sends converted chat messages, selected function tools, automatic
tool choice when tools are present, `max_tokens`, streaming, and usage streaming
options.

## Not Used Here

This path only covers Perplexity research-chat models.

