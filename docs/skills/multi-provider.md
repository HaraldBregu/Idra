# Multi-Provider Skills Guide

When an agent works with both Anthropic and OpenAI, the skill systems share a
common structure (`SKILL.md` with YAML frontmatter) but differ in how skills
are attached, versioned, and constrained at runtime. This page covers the
decision points and patterns for keeping the two in sync.

## What Is Common

Both providers:

- Use a `SKILL.md` file at the package root with YAML frontmatter (`name`,
  `description`) as the metadata Claude/GPT reads first.
- Load skill instructions only when the model decides the skill is relevant.
- Support additional supporting files (references, scripts, templates, assets).
- Treat skills as privileged code that can influence planning and tool calls.
- Version skills independently of each other.

This means a single skill bundle can be the source of truth. Maintain one
folder per skill and upload it to each provider separately.

## Key Differences

| Concern | Anthropic | OpenAI |
| --- | --- | --- |
| Attachment field | `container.skills[]` on Messages API | `tools[].environment.skills[]` on shell tool |
| Skill reference type | `type: "anthropic"` or `type: "custom"` | `type: "skill_reference"` (hosted) or inline metadata (local) |
| Default version key | `"latest"` string | `default_version` field; also accepts `"latest"` |
| Max bundle size | 30 MB | 50 MB zip, 25 MB per file |
| Max files per version | not specified | 500 |
| Max skills per request | 8 | not specified |
| Local execution mode | Claude Code (filesystem-based) | local shell environment |
| Network access from skill | blocked in API | depends on hosted vs local shell |
| Beta headers required | yes (`code-execution`, `skills`, optionally `files-api`) | no |

## Attaching Skills Per Provider

### Anthropic (Messages API)

```python
response = client.beta.messages.create(
    model="claude-opus-4-7",
    max_tokens=4096,
    betas=["code-execution-2025-08-25", "skills-2025-10-02"],
    container={
        "skills": [
            {"type": "custom", "skill_id": "skill_01AbCdEfGhIjKlMnOpQrStUv", "version": "latest"}
        ]
    },
    tools=[{"type": "code_execution_20250825", "name": "code_execution"}],
    messages=[{"role": "user", "content": "..."}],
)
```

### OpenAI (Responses API, hosted shell)

```javascript
const response = await openai.responses.create({
  model: "gpt-4o",
  tools: [
    {
      type: "shell",
      environment: {
        type: "container_auto",
        skills: [
          { type: "skill_reference", skill_id: "<skill_id>" }
        ],
      },
    },
  ],
  messages: [{ role: "user", content: "..." }],
});
```

### OpenAI (local shell)

```javascript
skills: [
  {
    name: "csv-insights",
    description: "Summarize CSV files and produce a markdown report.",
    path: "<path-to-skill-folder>",
  },
]
```

## Writing Skills That Work Across Both

Because both providers use the same `SKILL.md` format, the skill package
itself is provider-agnostic. The differences are only in the upload and
attachment step.

Authoring rules that apply equally to both:

1. **One skill, one concern.** Do not bundle unrelated workflows. The model
   uses the description to decide relevance — a narrow description triggers
   more reliably than a broad one.
2. **Write the description as a trigger.** State what the skill does and the
   conditions under which the model should use it.
3. **Keep `SKILL.md` concise.** Move large references, templates, and examples
   into supporting files. Both providers load supporting files only when
   referenced.
4. **Pin versions in production.** Both providers support explicit version ids.
   Use `"latest"` only during development.
5. **Avoid reserved words.** Anthropic reserves `anthropic` and `claude` in
   skill names. Keep names lowercase, hyphen-separated, and under 64 characters
   to satisfy both providers.

## Deciding Which Provider To Call

When an agent can reach both providers, route by what the workflow requires:

| Workflow need | Use |
| --- | --- |
| Generate Office files (pptx, xlsx, docx, pdf) | Anthropic — Anthropic-managed document skills are purpose-built for this |
| Multi-turn stateful execution (reuse container) | Anthropic — container ids persist across turns |
| Code execution on your own infrastructure | OpenAI local shell — keeps data on-premises |
| Combine skills with network calls inside the container | OpenAI hosted shell — Anthropic blocks network access from skills in the API |
| Hard limit of more than 8 skills in one request | OpenAI — Anthropic caps at 8 per request |

If neither constraint applies, prefer the provider whose model is already
handling the surrounding conversation to avoid extra API round-trips.

## Adapters

The project ships a thin adapter layer at `src/shared/skill-adapters.ts` that
converts the internal `SkillInfo` type into the exact payload shape each
provider expects. The three exported converters map directly onto the three
attachment modes:

| Function | Provider | Mode | Output shape |
| --- | --- | --- | --- |
| `toAnthropicSkills` | Anthropic | Messages API | `container.skills[]` |
| `toOpenAIHostedSkills` | OpenAI | Hosted shell | `tools[n].environment.skills[]` |
| `toOpenAILocalSkills` | OpenAI | Local shell | `tools[n].environment.skills[]` |

For call sites that know the provider at build time, call the specific
converter directly. For call sites where the provider is chosen at runtime,
use `resolveSkillAttachments` and pass a target per skill:

```typescript
import { resolveSkillAttachments } from './shared/skill-adapters';

const { anthropic, openaiLocal } = resolveSkillAttachments([
  {
    info: csvInsightSkill,
    target: { provider: 'anthropic', remoteId: 'skill_01AbCdEf', version: 'latest' },
  },
  {
    info: reportSkill,
    target: { provider: 'openai-local' },
  },
]);

// anthropic.skills → ready to pass as container.skills to Anthropic SDK
// openaiLocal     → ready to pass as environment.skills to OpenAI local shell
```

The `remoteId` for hosted providers is the id returned by the Skills API after
upload. Store it in `versions.json` (see Version Management below) and look it
up before building the payload.

### Anthropic-managed document skills

To attach an Anthropic-managed skill (pptx, xlsx, docx, pdf), bypass the
adapter and add the entry directly — no `remoteId` is required:

```typescript
const container = {
  skills: [
    { type: 'anthropic', skill_id: 'pptx', version: 'latest' },
    ...resolveSkillAttachments(customSkills).anthropic?.skills ?? [],
  ],
};
```

## Version Management Across Providers

Track skill versions in a central manifest so both providers stay in sync.
A minimal approach:

```text
skills/
├── csv-insights/
│   ├── SKILL.md
│   └── references/guide.md
└── versions.json
```

`versions.json` records the uploaded version id for each provider:

```json
{
  "csv-insights": {
    "anthropic": "skill_01AbCdEfGhIjKlMnOpQrStUv",
    "openai": "skill_9xYzAbCdEfGh"
  }
}
```

Update `versions.json` after every upload and reference it when building
request payloads. This prevents stale ids and makes rollbacks explicit.

## Security Checklist

Apply this checklist to every skill before uploading it to either provider:

- [ ] `SKILL.md` and all referenced files reviewed for hidden instructions
- [ ] No instructions that bypass safety, exfiltrate data, or hide actions
- [ ] Scripts reviewed for network calls, file access patterns, and package
      dependencies
- [ ] Skill is scoped to an approved workflow, not freely attachable by end
      users
- [ ] Write actions or high-impact operations require explicit approval in the
      prompt flow
- [ ] Data residency and retention requirements checked for hosted execution

Skills are not inert documentation. Treat them as software dependencies.

## References

- [Anthropic skills overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
- [Anthropic skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [OpenAI skills guide](https://developers.openai.com/api/docs/guides/tools-skills)
- [Agent Skills standard](https://agentskills.io/home)
