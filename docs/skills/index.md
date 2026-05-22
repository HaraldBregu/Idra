# Skills

Skills are reusable, filesystem-based capabilities that give Friday extra
domain knowledge or workflows. A skill packages instructions, metadata, and
optional resources such as scripts, templates, references, and assets.

Use skills when the same guidance should be available across agent sessions
without pasting it into every prompt. Use a prompt for one-off instructions; use
a skill for repeatable expertise.

## Usage

Friday manages custom Agent Skill folders through Settings > Skills.

| Action | Behavior |
| --- | --- |
| Upload | Select a folder that contains one `SKILL.md`, or a container folder with child skill folders. |
| List | Friday reads managed skill metadata and shows the skill root path, descriptions, and diagnostics. |
| Details | Friday shows id, format, version, category, safety level, visibility, author, tools, connectors, tags, model visibility, and file paths. |
| Download | Copy a managed skill folder to another local directory. |
| Delete | Remove the managed skill folder and unregister it. |

The agent discovers skills from registered metadata. When a request matches a
skill, Friday can execute `execute_skill` for that skill id. Dynamic Agent Skill
execution activates the skill by returning its instructions, resource paths, and
declared tool access into the agent run.

## Loading Model

Skills use progressive loading so only relevant material enters the agent
context.

| Level | When loaded | Friday behavior |
| --- | --- | --- |
| Metadata | During import, listing, and registration | Friday parses `SKILL.md` frontmatter to build the manifest, search text, diagnostics, and safety fields. |
| Instructions | When the skill is selected for a request | `execute_skill` activates the skill and returns the `SKILL.md` body as instructions. |
| Resources | Only when needed by the activated instructions | Friday exposes paths under `scripts/`, `references/`, and `assets/`; file contents or scripts are used only if the run explicitly reads or executes them through allowed tools. |

This keeps large references out of the model context until they are relevant.
Scripts are preferred for deterministic work because the agent can run the
script and receive only its output.

## Folder Structure

Each direct skill package must include exactly one `SKILL.md` at the package
root.

```text
example-skill/
├── SKILL.md
├── references/
│   └── api-guide.md
├── scripts/
│   └── validate-input.js
└── assets/
    └── template.md
```

Friday also accepts container folders that include child skill folders. During
import, ignored directories such as `.git`, `node_modules`, `dist`, `build`,
`coverage`, virtual environments, and cache folders are skipped.

## Skill File

`SKILL.md` must start with YAML frontmatter. `name` and `description` are the
core fields.

```markdown
---
name: document-brief
description: Summarize long documents into concise briefs. Use when the user asks for a document summary, executive brief, or key takeaways.
allowed-tools: read find
category: content
tags:
  - documents
  - summary
version: 0.1.0
---

# Document Brief

Read the source document, identify the main claims, and return a concise brief
with key takeaways and open questions.
```

Skill descriptions should say both what the skill does and when the agent
should use it. Keep `SKILL.md` short and move detailed reference material into
`references/`.

Friday accepts these common manifest fields:

| Field | Purpose |
| --- | --- |
| `name` | Skill display name and source for the normalized id. |
| `description` | Discovery text used to decide when the skill is relevant. |
| `allowed-tools` or `allowedTools` | Tools the skill may use after activation. |
| `requiredTools` | Tools that must be available before the skill can run. |
| `requiredConnectors` | Connectors that must be available before the skill can run. |
| `requiredMemoryKinds` | Memory categories the skill expects to read. |
| `category`, `tags`, `version`, `author` | Organization and display metadata. |
| `visibility`, `safetyLevel` | Runtime and UI metadata. |
| `inputSchema`, `outputSchema` | Structured input and output contracts. |
| `dependencies` | Other skills this skill depends on. |
| `disable-model-invocation` | Hide the skill from automatic prompt discovery when true. |
| `user-invocable` | Marks whether the user should be able to invoke the skill directly. |
| `metadata` | Additional string metadata for compatibility. |

For maximum Agent Skills compatibility, use lowercase names with numbers and
single hyphens only, keep names at 64 characters or less, and make the folder
name match the skill name.

## Safety Rules

Treat a skill like local software:

- Import skills only from trusted sources or after auditing every bundled file.
- Check scripts for unexpected file access, network calls, shell commands, and
  secret handling.
- Do not include API keys, tokens, credentials, or private data in a skill
  package.
- Treat fetched external content as untrusted input.
- Declare only the tools and connectors the skill actually needs.

Friday scopes runtime access before execution. A skill cannot use a tool unless
the tool is available and declared by the skill. Connector access is checked the
same way. Friday also blocks recursive skill execution, enforces a maximum
nested skill depth, validates input and output schemas, records provenance, and
warns on prompt-injection-like input.

## Limits

Friday currently supports custom filesystem Agent Skills. Anthropic's pre-built
document skills are Anthropic product features and are separate from Friday's
local skill manager.

Managed Friday skills are local to the app data directory shown in Settings >
Skills. They do not automatically sync to Claude, the Claude API, Claude Code,
or other agent surfaces.

