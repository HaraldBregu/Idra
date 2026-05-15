# Prompt: Add a User-Owned `.friday` Data Directory

Use this prompt to implement a new user-owned data directory for Friday.

## Goal

Friday currently stores application-owned information in Electron's app data location through `app.getPath('userData')`. Add a separate sibling folder named `.friday` next to the `friday` project/application folder. This new folder is for user-owned data, files, databases, assistant workspaces, generated artifacts, and other content that belongs to the user rather than to the application runtime.

## Current Assumptions

- The repository/application folder is named `friday`.
- The new folder should live at the same parent path as `friday`.
- In this checkout, that means:
  - app/project folder: `/Users/haraldbregu/Desktop/friday`
  - user data folder: `/Users/haraldbregu/Desktop/.friday`
- Electron `userData` remains the application data folder and should still hold app settings, provider configuration, logs, caches, and other app runtime state unless a specific store is reclassified as user-owned.
- The `.friday` directory must be created by the main process, not by the renderer.
- Renderer access must go through existing typed IPC/preload patterns.

## Success Criteria

1. Friday has one main-process source of truth for the `.friday` root path.
2. User-owned files and databases use `.friday` instead of Electron `userData`.
3. Application-owned settings and logs continue to use Electron `userData`.
4. The app creates `.friday` when needed with safe permissions.
5. Existing path traversal protections still apply to workspace/file operations.
6. Tests cover path resolution, directory creation, and at least one migrated user-owned store.
7. The UI can expose both locations clearly if it currently exposes app data:
   - Application Data: Electron `userData`
   - User Data: sibling `.friday`

## Implementation Plan

### 1. Audit Current Storage

Search for all storage path creation:

```bash
rg -n "app\\.getPath\\('userData'\\)|app\\.getPath\\(\"userData\"\\)|WorkspaceService|path\\.join\\(app\\.getPath|electron-store|sqlite|databasePath" src
```

Classify each location:

| Location Type | Examples | Target |
| --- | --- | --- |
| App-owned settings | provider config, assistant service selection, connector config, feature settings | keep in Electron `userData` |
| App-owned runtime | logs, crash metadata, caches, transient app state | keep in Electron `userData` |
| User-owned content | workspaces, generated files, imported files, documents, local databases, assistant memory content | move to `.friday` |
| Ambiguous | sessions, run history, skills, apps, connector-local data | decide explicitly and document |

Do not move secrets into `.friday` unless there is an explicit product decision and a secure storage design.

### 2. Add a Central Path Service

Add a small main-process path helper or service. Prefer extending an existing boundary if the codebase already has one, such as `WorkspaceService`; otherwise add a minimal service under `src/main`.

Required behavior:

- Resolve the app/project folder.
- Resolve its parent folder.
- Resolve the user data root as `path.join(parent, '.friday')`.
- Create the directory recursively before first use.
- Keep the folder name in a single exported constant.
- Return absolute normalized paths only.
- Provide a helper that safely resolves child paths under `.friday` and rejects traversal outside the root.

Suggested shape:

```ts
export const USER_DATA_DIRECTORY_NAME = '.friday';

export interface UserDataDirectoryService {
  getRootPath(): string;
  ensureRoot(): Promise<string>;
  resolve(...segments: string[]): string;
}
```

Keep this simple. Do not add configurability unless the implementation needs it for tests. For tests, inject the base application folder path or a filesystem adapter instead of relying on the real checkout path.

### 3. Wire the Service Through Main Process Dependencies

Register the path service during bootstrap next to other global services.

Use it anywhere user-owned data paths are created. Candidate areas to review:

- `src/main/workspace/service.ts`
- `src/main/memory.ts`
- `src/main/session/store.ts`
- `src/main/run-logger.ts`
- `src/main/task-manager/store/sqlite-task-store.ts`
- any future file, document, generated artifact, or local database store

Only migrate paths that are clearly user-owned. Leave app configuration in `StoreService`/`electron-store` unless product says otherwise.

### 4. Preserve App Data Separation

Keep these concepts distinct in names and UI copy:

- `appData`: Electron `app.getPath('userData')`, owned by the application.
- `userDataRoot`: sibling `.friday`, owned by the user.

Avoid naming the new service `AppDataService`; that will blur the boundary.

### 5. Add or Update IPC and UI, If Needed

If settings currently has an "Open app data" action, add a separate "Open user data" action.

Main process:

- expose a typed IPC handler that opens `.friday` with `shell.openPath`
- ensure the directory exists before opening
- return a typed success/error result consistent with existing IPC style

Renderer:

- show "Application Data" for Electron `userData`
- show "User Data" for `.friday`
- do not expose raw filesystem operations directly to the renderer

### 6. Migration Guidance

If an existing user-owned location already has data under Electron `userData`, implement a conservative migration:

1. Detect the old path and new path.
2. If the old path exists and the new path does not, copy or move the data once.
3. Prefer copy-then-verify-then-remove only if removal is required.
4. Do not overwrite existing `.friday` data.
5. Log a redacted migration summary.
6. Add tests for:
   - no old data
   - old data copied/moved into an empty new root
   - existing new data is not overwritten
   - migration failure returns a safe error

If migration is not implemented in the first pass, document the reason and make the app use `.friday` for new data only.

### 7. Security and Privacy Requirements

- Create `.friday` with owner-only permissions where supported.
- Reject `..`, absolute child paths, symlink escapes, and path traversal attempts when resolving user-owned files.
- Do not store API keys, provider tokens, passwords, private keys, or connector secrets in `.friday` by default.
- Redact `.friday` file contents from logs unless the user explicitly requests inspection.
- Keep export/delete behavior practical for user-owned data.

### 8. Tests

Add focused tests before or with the implementation.

Minimum coverage:

- path service resolves `.friday` as a sibling of the injected `friday` app folder
- root creation is idempotent
- child path resolution stays inside root
- traversal attempts are rejected
- at least one migrated user-owned module uses the new service

Run the relevant checks:

```bash
yarn typecheck
yarn lint
yarn test
```

If the repo has a narrower quality command, prefer that command after focused tests pass:

```bash
yarn quality:check
```

## Acceptance Checklist

- [ ] `.friday` is created next to `friday`.
- [ ] The folder name is centralized as a constant.
- [ ] App settings still use Electron `userData`.
- [ ] User-owned files/databases no longer default to Electron `userData`.
- [ ] No renderer code directly constructs privileged filesystem paths.
- [ ] Settings UI, if updated, clearly distinguishes application data from user data.
- [ ] Tests prove path resolution and traversal protection.
- [ ] Documentation explains what belongs in `.friday` and what stays in app data.

## Notes for the Implementer

Keep the first implementation surgical. Do not redesign all storage. Start by adding the path boundary, migrate the clearest user-owned store, and document any ambiguous stores that need a product decision.
