# SkillsApi Preload Prompt

Expose skill management through `window.skills`. `SkillsApi` is the renderer-safe bridge to `SkillsService`; it must not expose filesystem paths or service methods beyond the approved API.

## Expose

- `list()`: list installed skills.
- `importSkill()`: open a main-process directory picker and import the selected skill.
- `downloadSkill(id)`: open a main-process destination picker and download a skill.
- `delete(id)`: delete an installed skill by id.
- `getRoot()`: return the skills root path.

## Dependencies

- Shared types: `src/shared/skills.ts`.
- Channels: `SkillsChannels` and `SkillsInvokeChannelMap` in `src/shared/ipc-channels/index.ts`.
- Preload interface: `SkillsApi` in `src/preload/index.d.ts`.
- Preload implementation: `skills` in `src/preload/index.ts`.
- Main IPC: `src/main/ipc/skills-ipc.ts`.
- Main services: `skills` and Electron `dialog`.

## Rules

- Use `typedInvokeUnwrap` for every method.
- Keep file picking in the main process through Electron `dialog`.
- Return `undefined` when the user cancels import or download selection.
- Keep skill validation, copying, downloading, deletion, and root-path policy in `SkillsService`.
- Do not expose arbitrary filesystem reads or writes through `SkillsApi`.

## Verification

- Run `yarn typecheck:node` for shared, preload, or IPC type changes.
- Run focused skills service or IPC tests when skill behavior changes.
- Run `yarn typecheck:web` when renderer consumers change.
