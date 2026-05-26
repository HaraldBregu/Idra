# Mistral Large Language Models

This folder documents Mistral large language models.

Capability values are based on current Mistral documentation. `Family` means the
capability is documented for the model family or current alias, but the exact
versioned model string was not exposed in the scraped capability matrix.

| Model | Status | Skills | Tools | Reasoning | Notes |
| --- | --- | --- | --- | --- | --- |
| `mistral-large-2512` | Documented | Not documented | Yes | Not documented | Mistral documents Large-family models for function calling; no dedicated reasoning controls were found. |
| `mistral-medium-3-5` | Documented | Not documented | Family | Not documented | Mistral documents Medium 3.x as agentic/coding-capable and includes Medium-family function-calling support; no dedicated reasoning controls were found. |
| `devstral-2512` | Documented | Not documented | Yes | Not documented | Mistral documents Devstral for coding-agent workflows and function calling; no dedicated reasoning controls were found. |

## Sources

- [Mistral function calling](https://docs.mistral.ai/capabilities/function_calling/)
- [Mistral Large 3](https://mistral.ai/news/mistral-large-3)
- [Mistral models documentation](https://docs.mistral.ai/getting-started/models/models_overview/)
- [Devstral documentation](https://docs.mistral.ai/capabilities/code_generation/)
