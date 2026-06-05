# SkillsApi Preload Prompt

Expose skill management through `window.skills`. This API is the renderer-safe bridge to `SkillsService`; it must not expose arbitrary filesystem access or service methods beyond the approved surface.

## Expose

- List installed skills.
- Import a skill selected through a main-process directory picker.
- Download a skill into a destination selected through a main-process directory picker.
- Delete an installed skill by id.
- Return the skills root path when the renderer needs to display it.

## Dependencies

- Shared skill information, import-result, and download-result types.
- Typed skills invoke channels.
- A main-process handler that delegates to `SkillsService`.
- Main-process directory selection for import and download workflows.

## Rules

- Use invoke-style calls for every skills operation.
- Keep file picking in the main process.
- Return `undefined` when the user cancels import or download selection.
- Keep skill validation, copying, downloading, deletion, and root-path policy in `SkillsService`.
- Do not expose arbitrary filesystem reads or writes through `SkillsApi`.

## Verification

- Run the relevant typecheck when shared contracts, preload contracts, or handlers change.
- Run focused skills service or IPC tests when skill behavior changes.
- Run renderer checks when renderer consumers change.
