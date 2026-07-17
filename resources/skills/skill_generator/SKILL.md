---
name: skill_generator
description: Creates new skills for this application. Gathers what the skill should do, generates a valid SKILL.md, and installs it into the agent skills folder so the app can discover, search, and load it.
category: developerTools
tags:
  - skills
  - generator
  - authoring
version: 1.0.0
---

# Skill Generator

You are running with the skill_generator skill active. Your job is to author a new skill for this application and store it in the agent skills folder, following the exact format the app's skill loader expects.

## Where skills live

The app discovers skills by scanning every direct subdirectory of the agent skills root:

```
<userData>/agent/skills/<skill-id>/SKILL.md
```

`<userData>` is the Electron user-data directory of this app (product name "Friday"):

- macOS: `~/Library/Application Support/Friday`
- Windows: `%APPDATA%\Friday`
- Linux: `~/.config/Friday`

If the `agent/skills` directory does not exist yet, create it (recursively).

## Skill structure (agentskills.io format)

Each skill is one folder. The folder name is the skill id.

```
<skill-id>/
├── SKILL.md          (required — the only mandatory file)
├── scripts/          (optional — executable helpers the skill references)
├── references/       (optional — docs the skill can point the agent to)
└── assets/           (optional — static files, templates, images)
```

Rules:

- The folder name (skill id) must be unique under the skills root. Use a short, lowercase snake_case name — words separated by underscores, never hyphens (e.g. `commit_helper`, `pdf_summarizer`).
- `SKILL.md` must be named exactly that, at the top level of the folder.
- Only create `scripts/`, `references/`, or `assets/` when the skill actually ships files in them — never empty.

## SKILL.md format

YAML frontmatter followed by a Markdown body:

```markdown
---
name: <skill-id>
description: <one or two sentences: what the skill does AND when to use it>
---

# <Skill Title>

<One short paragraph: what the agent is doing when this skill is active.>

## Instructions

<Numbered steps or bullet rules the agent must follow.>
```

Frontmatter fields:

- `name` (required) — matches the folder name. If missing or blank the app falls back to the folder name; set it anyway.
- `description` (required) — this is what skill search matches against, so include the trigger phrases a user would say.
- Optional fields the app understands: `license`, `compatibility`, `category`, `tags`, `version`, `author`, `visibility` (`public` | `private` | `internal` | `unlisted`), `safetyLevel` (`low` | `medium` | `high` | `restricted`), `requiredTools`, `allowedTools`, `requiredConnectors`, `examples`, `dependencies`, `deprecated`, `metadata`. Only add the ones that carry real information.
- `category`, if used, must be one of: `communication`, `research`, `coding`, `planning`, `analytics`, `productivity`, `content`, `workflow`, `automation`, `support`, `retrieval`, `reasoning`, `creative`, `operations`, `developerTools`.
- Do not set `enabled` — the app manages that itself.

Body guidelines:

- Write instructions to the agent, second person ("you"), imperative.
- Be concrete: exact commands, exact file contents, exact output requirements.
- Keep it minimal — only what the agent needs to execute the skill.

## Workflow

1. **Gather requirements.** From the user's request, determine: what the skill does, when it should trigger, and any files it needs. If the purpose is genuinely ambiguous, ask one clarifying question; otherwise proceed.
2. **Pick the id.** Derive a short lowercase id from the purpose. Check the skills root for a folder with the same name; if taken, ask whether to overwrite or pick a different id.
3. **Write the skill.** Create `<userData>/agent/skills/<skill-id>/SKILL.md` with the format above, plus any resource directories the skill needs.
4. **Validate.** Re-read the file and confirm: frontmatter parses as YAML, `name` and `description` are non-empty strings, the body has at least one instruction, and `category` (if present) is from the allowed list.
5. **Report.** State the absolute path of the created skill folder, its id, and its description, and mention that the app will pick it up on the next skill listing.
