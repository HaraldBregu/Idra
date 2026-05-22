# Skills

Agent Skills are reusable, versioned bundles of instructions and files that an
agent can load when a workflow needs them. Use them for repeatable processes,
team conventions, style guides, and multi-step procedures that should not live
directly in a system prompt.

OpenAI supports skills in hosted shell environments and local shell
environments. The attachment format is different for each mode.

## What A Skill Contains

A skill is a single top-level folder with one `SKILL.md` manifest. The manifest
contains front matter plus the instructions the model should follow. A skill can
also include supporting files such as scripts, references, templates, or assets.

Important validation rules:

- `SKILL.md` matching is case-insensitive.
- A skill bundle can contain exactly one `skill.md` or `SKILL.md` file.
- Front matter follows the Agent Skills specification.
- A zip upload can be at most `50 MB`.
- A skill version can contain at most `500` files.
- An uncompressed file can be at most `25 MB`.

## How Skills Load

When skills are available to a shell tool, the platform exposes each skill's
`name`, `description`, and `path` to the model. The model uses that metadata to
decide whether a skill is relevant.

If the model invokes a skill, it reads the full `SKILL.md` from the skill path.
Skill instructions are treated as user-prompt input, not system-prompt input, so
they should be considered powerful but not higher priority than system or
developer instructions.

For more deterministic behavior, explicitly prompt the model to use a named
skill:

```text
Use the <skill name> skill for this task.
```

## Hosted Shell Usage

Hosted shell environments use uploaded skill references. Attach skills through
`tools[].environment.skills` on the shell tool:

```javascript
{
  type: "shell",
  environment: {
    type: "container_auto",
    skills: [
      { type: "skill_reference", skill_id: "<skill_id>" },
      { type: "skill_reference", skill_id: "<skill_id>", version: 2 },
    ],
  },
}
```

If `version` is omitted, OpenAI uses the skill's `default_version`.
`skill_reference.version` can also be set to `"latest"` when the newest uploaded
version should be used.

## Local Shell Usage

Local shell mode does not use hosted `skill_reference` attachments. Provide
local skill metadata and a filesystem path controlled by the local runtime:

```javascript
{
  type: "shell",
  environment: {
    type: "local",
    skills: [
      {
        name: "csv-insights",
        description: "Summarize CSV files and produce a markdown report.",
        path: "<path-to-skill-folder>",
      },
    ],
  },
}
```

Use local shell mode when code execution should stay on infrastructure you
control.

## Creating And Updating Skills

Skills can be uploaded as multipart directory data or as a zip file containing a
single top-level folder.

For version management:

- `default_version` is used when no version is provided.
- `latest_version` tracks the newest upload.
- The default version cannot be deleted until another version is made default.
- Deleting the final version deletes the skill.
- Deleting a skill deletes all of its versions.

## Safety Rules

Treat skills as privileged instructions and code. A skill can influence planning,
tool calls, command execution, and data handling.

- Review every skill before attaching it to a Responses API request.
- Do not let end users freely attach arbitrary skills from an open catalog.
- Map approved skills to specific product workflows.
- Require approval for write actions or high-impact operations.
- Be especially careful when skills are combined with network access.
- Validate data residency and retention requirements before choosing hosted
  execution.

Hosted skills follow the hosted shell container lifecycle: mounted skills and
container files remain available while the container is active, then are
discarded when the container expires or is deleted.

## References

- [OpenAI Skills guide](https://developers.openai.com/api/docs/guides/tools-skills)
- [OpenAI Shell tool guide](https://developers.openai.com/api/docs/guides/tools-shell)
- [Agent Skills standard](https://agentskills.io/home)
