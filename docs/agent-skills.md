# Agent Skills

Friday accepts local Agent Skills using the portable structure documented at
https://agentskills.io/home.

## Accepted folder shapes

Upload either a single skill folder:

```text
my-skill/
  SKILL.md
  scripts/
  references/
  assets/
```

Or a container folder with one level of skill children:

```text
skills/
  writing/
    SKILL.md
  analysis/
    SKILL.md
```

Friday also accepts one grouping level:

```text
team-skills/
  docs/
    release-notes/
      SKILL.md
```

Project folders can use the cross-client `.agents/skills` convention:

```text
project/
  .agents/
    skills/
      project-skill/
        SKILL.md
```

The importer ignores hidden directories, `.git`, `node_modules`, common build
outputs, caches, and virtual environments.

## `SKILL.md` frontmatter

Minimum:

```markdown
---
name: my-skill
description: Describe what this skill does and when Friday should use it.
---

# My Skill

Write concise instructions for the workflow.
```

Standards Friday validates or reports as diagnostics:

- `name` should be lowercase letters, numbers, and single hyphens.
- `name` should be 64 characters or fewer.
- `name` should match the parent folder name.
- `description` is required and should explain both the task and trigger cases.
- `compatibility` must be 500 characters or fewer.
- `metadata` should be a string key-value map for maximum portability.
- Keep `SKILL.md` under 500 lines; move detail to `references/`.
- Reference bundled files with paths relative to the skill root.

Supported optional fields:

- `license`
- `compatibility`
- `metadata`
- `allowed-tools`
- `disable-model-invocation`
- `user-invocable`

Skills are instructions and optional tool-contract hints. They do not grant
permissions, change sandbox policy, or bypass Friday's tool approval and runtime
policy.
