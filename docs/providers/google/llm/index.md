# Google Large Language Models

This folder documents Google large language models.

Capability values are based on current Google AI and Vertex AI documentation.
`Family` means the capability is documented for the Gemini 3 or Flash-Lite
family, but the exact model string was not exposed in the scraped capability
matrix.

| Model | Status | Skills | Tools | Reasoning | Notes |
| --- | --- | --- | --- | --- | --- |
| `gemini-3.1-pro-preview` | Documented | Not documented | Family | Family | Gemini 3.1 Pro is available in the API; Gemini 3 model docs cover function calling, tools, and thinking. |
| `gemini-3.1-flash-lite` | Documented | Not documented | Family | Family | Google documents Gemini Flash-Lite as a lower-cost Gemini line; function calling and thinking are documented for Gemini model families. |

## Sources

- [Gemini 3.1 Pro preview announcement](https://blog.google/products/gemini/gemini-31-pro-preview/)
- [Gemini API model documentation](https://ai.google.dev/gemini-api/docs/models)
- [Gemini function calling](https://ai.google.dev/gemini-api/docs/function-calling)
- [Gemini thinking](https://ai.google.dev/gemini-api/docs/thinking)
