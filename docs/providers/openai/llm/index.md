# OpenAI Large Language Models

This folder documents OpenAI large language models.

Capability values are based on current OpenAI documentation. `Runtime` means the
feature is provided through the Responses API tool runtime rather than a
standalone model flag.

| Model | Status | Skills | Tools | Reasoning | Notes |
| --- | --- | --- | --- | --- | --- |
| `gpt-5.5` | Documented | Runtime | Yes | Yes | Skills attach through shell environments; supports hosted tools, function tools, tool search, and GPT-5.5 reasoning controls. |
| `gpt-5.4` | Documented | Runtime | Yes | Yes | GPT-5.5 carries forward GPT-5.4 tool-calling patterns; `gpt-5.4` and later support `tool_search`. |
| `gpt-5.4-mini` | Documented | Runtime | Yes | Yes | Smaller GPT-5.4-family model; documented GPT-5 tooling and reasoning behavior applies to the GPT-5 series. |

## Sources

- [OpenAI Skills guide](https://developers.openai.com/api/docs/guides/tools-skills)
- [OpenAI tools guide](https://developers.openai.com/api/docs/guides/tools)
- [Using GPT-5.5](https://developers.openai.com/api/docs/guides/latest-model#using-reasoning-models)
