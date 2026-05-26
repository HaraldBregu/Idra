# Anthropic Large Language Models

This folder documents Anthropic large language models.

Capability values are based on current Anthropic documentation. `Runtime` means
the feature is provided through Claude API or Claude app agent tooling rather
than a standalone model flag.

| Model | Status | Skills | Tools | Reasoning | Notes |
| --- | --- | --- | --- | --- | --- |
| `claude-opus-4-7` | Documented | Runtime | Yes | Yes | Agent Skills are available in Claude API and Claude app surfaces; Claude 4 models support tool use and extended thinking. |
| `claude-sonnet-4-6` | Documented | Runtime | Yes | Yes | Same Claude agent-tooling surface; optimized for speed and intelligence with extended thinking support. |
| `claude-haiku-4-5-20251001` | Documented | Runtime | Yes | Yes | Same Claude agent-tooling surface; Haiku 4.5 is documented as a fast extended-thinking Claude model. |

## Sources

- [Anthropic Agent Skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Anthropic tool use overview](https://platform.claude.com/docs/en/docs/agents-and-tools/tool-use/overview)
- [Anthropic extended thinking models](https://platform.claude.com/docs/en/docs/about-claude/models/extended-thinking-models)
