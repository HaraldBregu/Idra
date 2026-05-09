---
name: Friday test infrastructure
description: Jest multi-project setup for the Friday Electron app — framework, config, conventions, mock strategy, and infrastructure files created
type: project
---

**Framework:** Jest 30 + ts-jest 29, CJS mode, multi-project config at `jest.config.cjs`.

**Projects:**
- `main` — Node env, roots: `tests/unit/main/` and `tests/integration/`
- `renderer` — jsdom env, roots: `tests/unit/renderer/`

**Run commands:**
- `yarn test:main` — main process only
- `yarn test:renderer` — renderer only
- `yarn test` — all projects
- `yarn test:coverage` — with coverage

**File naming:** `*.test.ts` (main), `*.test.ts` / `*.test.tsx` (renderer). Test files mirror src tree under `tests/unit/main/` or `tests/unit/renderer/`.

**Infrastructure files created (all under `tests/`):**
- `mocks/electron.ts` — stubs `app`, `ipcMain`, `BrowserWindow`
- `mocks/chokidar.ts` — CJS stub for chokidar v5 (pure ESM)
- `mocks/raw-md.ts` — stub for `*.md?raw` Vite imports
- `setup/main.ts` — seeds `globalThis.__VITE_ENV__`
- `setup/polyfills.ts` — browser polyfills (matchMedia) for jsdom
- `setup/renderer.ts` — imports `@testing-library/jest-dom`
- `transforms/vite-env-transform.cjs` — rewrites `import.meta.env.*` and `import.meta.glob(...)` before ts-jest compiles; uses `TsJestTransformer` (not `createTransformer` which doesn't exist in ts-jest v29)
- `integration/.gitkeep` — placeholder; Jest requires the `tests/integration` root directory to exist

**Transform note:** The custom vite-env-transform is applied to all `src/main/**/*.ts` files. It rewrites:
- `import.meta.glob(...)` → `({})`
- `import.meta.env.FOO` → `(globalThis.__VITE_ENV__ || {}).FOO`
- `import.meta.env` → `(globalThis.__VITE_ENV__ || {})`

**Global Jest config:** `clearMocks`, `resetMocks`, `restoreMocks` all set to `true`. Coverage threshold 50% branches/functions/lines/statements.

**electron-store mocking pattern:** `jest.mock('electron-store', ...)` with an in-memory Map-backed fake. Mock is placed at the top of the test file (before imports). Access the Store constructor as `Store as jest.MockedClass<typeof Store>` after importing to assert ctor call args. Private `store` field on StoreService is accessed via `(service as unknown as { store: ... }).store.set(...)` to pre-seed data without a public setter.

**Test files created:**
- `tests/unit/main/assistant/service.test.ts` — AssistantService; uses jest.mock + static property trick
- `tests/unit/main/store/service.test.ts` — StoreService; uses Map-backed electron-store fake

**Why:** The tests/ directory did not exist at all — the entire infrastructure was bootstrapped for the first test suite.
**How to apply:** When adding new test files, all infrastructure is already in place. Only create test files under `tests/unit/main/` or `tests/unit/renderer/`.
