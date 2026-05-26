# Skills Module Prompt

Create a skills module that is strictly implemented as a reusable service.

The skills module manages Agent Skills for the application. Any module that needs to list, import, download, delete, validate, or resolve skills should use this service instead of creating its own skills logic.

Skills must be stored in a predefined directory. For now, store installed skills under `appdata/skills`.

The skills module has no service dependencies.

The skills module must use the application logger like the other services.

## Dependencies

- None. Keep skill management local to the skills service.

The skills module must never be implemented as a utility, helper, controller, or feature-specific module. It must always be a service.

Keep the skills module isolated:

- Do not import internal skills files from outside the skills module.
- Do not expose internal skills files directly.
- Only `index` exposes the skills module.
- Consumers must depend on the exported skills service.
- Skills behavior must stay centralized inside the skills service.

Types or files that need to be reused by other services or processes must be stored under `src/shared` so they can be used everywhere. Keep skills-specific implementation types and files inside the skills module unless they are genuinely shared.

When changing the skills service, refactor the service directly. Do not layer patch-style fixes, compatibility shims, or migration paths unless explicitly requested. Delete old implementations, exports, imports, tests, and service-local types made unused by the refactor.

## Skill Folder Format

A skill is a folder. The folder must contain a `SKILL.md` file and may contain optional support directories or any other bundled files the skill needs.

```text
my-skill/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code
├── references/       # Optional: documentation
├── assets/           # Optional: templates, resources
└── ...               # Any additional files or directories
```

`SKILL.md` is the source of truth for skill metadata and instructions. Do not create a separate manifest format for skills.

`SKILL.md` must contain YAML frontmatter followed by Markdown instructions.

Required frontmatter:

- `name`: 1-64 characters, lowercase letters, numbers, and hyphens only. It must not start or end with a hyphen, must not contain consecutive hyphens, and must match the parent directory name.
- `description`: 1-1024 characters. It must describe what the skill does and when to use it.

Optional frontmatter:

- `license`: license name or reference to a bundled license file.
- `compatibility`: environment requirements such as intended product, required system packages, or network access.
- `metadata`: additional key-value metadata.
- `allowed-tools`: space-separated tool allowlist when the runtime supports it.

The Markdown body contains the full instructions loaded when the skill is activated. Keep it focused on procedures, examples, and gotchas the agent needs to perform the task reliably.

Optional directories have these meanings:

- `scripts/`: executable code the agent may run. Scripts must be referenced by relative path from `SKILL.md`, avoid interactive prompts, provide useful errors, and prefer structured output.
- `references/`: supporting documentation loaded only when the instructions say it is needed.
- `assets/`: templates, images, schemas, lookup tables, or other static resources loaded only when needed.

All bundled file references must be relative to the skill root. Do not store or expose absolute paths inside skill content except when returning an installed skill location from the service.

## Service Behavior

The skills service should:

- Resolve the skills root path.
- List available skills by scanning skill folders under the skills root.
- Treat a folder as a skill only when it contains `SKILL.md`.
- Parse `SKILL.md` frontmatter and body content.
- Validate required frontmatter and naming rules.
- Import skills as whole folders, preserving `SKILL.md` and bundled resources.
- Download skills as whole folders, preserving `SKILL.md` and bundled resources.
- Delete installed skill folders by service-owned id or name.
- Return compact skill records with `name`, `description`, and installed location.
- Load full `SKILL.md` instructions only when a skill is selected or activated.
- Enumerate bundled support files without eagerly reading every referenced file.
- Log skill operations and failures through the application logger.

Use progressive disclosure:

1. Listing loads only skill metadata needed for discovery.
2. Activation loads the selected skill's `SKILL.md` instructions.
3. Supporting files in `scripts/`, `references/`, and `assets/` are read or executed only when the activated instructions reference them.

Do not scan arbitrary filesystem locations from renderer code. Import and download workflows must pass through the main-process service boundary.

## Error Handling

The skills root is allowed to be missing or empty.

- If the skills root directory does not exist, listing must return an empty list and must not fail application startup.
- If the skills root directory is empty, listing must return an empty list without logging an error.
- Mutating operations such as import and download must create the skills root when it is missing.
- Root path resolution must return the expected root path even when the directory has not been created yet.

Handle invalid or partial skill folders without breaking unrelated skills:

- Ignore non-directory entries in the skills root.
- Ignore folders that do not contain `SKILL.md`.
- Skip a skill when `SKILL.md` is missing required frontmatter, has an empty `description`, or contains unparseable YAML.
- Warn and skip a skill when `name` does not match the parent folder, contains invalid characters, starts or ends with a hyphen, contains consecutive hyphens, or exceeds the allowed length.
- Warn on duplicate skill names and apply one deterministic precedence rule.
- Keep scanning after any single skill fails validation.

Handle filesystem failures explicitly:

- Permission errors, read failures, copy failures, download failures, and delete failures must return typed failures or throw service-level errors that callers can display safely.
- Error messages must explain the operation, the affected skill or path when safe to expose, and the reason.
- Log operational failures through the application logger with enough context to debug them.
- Do not expose stack traces, arbitrary filesystem contents, or raw low-level errors to renderer consumers.
- Do not delete or overwrite an existing installed skill unless the requested operation explicitly allows replacement.
- Deleting a skill that is already missing should be treated as a successful no-op or a typed not-found result, but it must not crash the service.

## Testing

Test skill listing, import, download, deletion, root path resolution, missing root behavior, empty root behavior, `SKILL.md` parsing, validation failures, bundled-resource preservation, progressive loading behavior, and logger behavior for failures.

Tests should call the exported skills service and should not duplicate skills logic in feature modules.

When implementing the module, keep the structure minimal and service-focused. Do not add abstractions, configuration layers, separate manifests, or extra files unless they are required by the existing project conventions.
