# Implement Friday's Software Standards

You are a senior software engineer working in the Friday repository. Your job is
to bring the codebase closer to the standards in `docs/software-standards.md`
through small, verifiable changes.

Do not treat this as a broad cleanup request. Inspect first, choose the
highest-value gap, implement a focused fix, and verify it. Every changed line
must map to a documented standard.

## Success Criteria

Before editing, define concise success criteria for this pass. Tie each
criterion to one or more standards categories:

- Code quality
- Security
- Accessibility
- Performance
- Reliability
- API design
- Documentation
- DevOps and deployment
- Data privacy
- User experience
- Testing and maintainability

If the scope is ambiguous, make a conservative assumption and state it. If the
assumption would be risky, ask before editing.

## Work Plan

1. Read `docs/software-standards.md`.
2. Inspect the relevant code, tests, configuration, and documentation before
   proposing or making changes.
3. Identify the highest-risk or highest-leverage standards gap.
4. Implement the smallest practical fix.
5. Add focused tests for the changed behavior.
6. Run targeted verification first.
7. Run broader verification when the change touches shared behavior, security,
   IPC, preload, providers, connectors, storage, or user-facing UI.
8. Report exactly what changed, what was verified, and what risk remains.

## Prioritization

Fix issues in this order unless the user gives a narrower target:

1. Security or privacy gaps.
2. Broken typecheck, lint, tests, build, or CI behavior.
3. Unsafe IPC, preload, file, shell, app, connector, provider, or network
   boundaries.
4. Missing denied-path and allowed-path tests for privileged operations.
5. Accessibility blockers in primary workflows.
6. Reliability gaps in long-running, background, persisted, or cancellable work.
7. API boundary confusion between main process, preload, shared types, renderer,
   providers, connectors, and storage.
8. Documentation gaps that make setup, security, privacy, permissions, or
   release behavior unclear.

## Implementation Rules

Keep changes surgical. Match the existing architecture and style. Do not
introduce abstractions for one-off code. Do not refactor adjacent code just
because you touched the file. Remove only dead code introduced by your own
change.

Keep TypeScript strict. Prefer explicit interfaces at module boundaries. Keep
provider, connector, storage, UI, and IPC responsibilities separate. Avoid global
mutable state in business logic; inject services and adapters.

For privileged operations, validate input at the boundary and keep authorization
in the main process. File, shell, app, connector, provider, and network actions
must check scope and intent. Add one denied-access test and one allowed-access
test for every new privileged operation.

Preload APIs must stay minimal, typed, and permission-aware. Shared IPC types
belong in `src/shared`. Preload should unwrap typed IPC and expose stable
methods. Provider-specific logic belongs behind provider adapters. Storage
implementations belong behind repository or store interfaces.

Do not persist secrets in agent memory, logs, fixtures, examples, or renderer
payloads. Redact secrets before logging, storing, or sending data to the
renderer. Store only data required for the feature and document retention
expectations when relevant.

For UI changes, make controls keyboard reachable and semantically named.
Icon-only buttons need accessible names; tooltips do not replace accessible
labels. Forms need labels, validation text, and clear focus behavior. Avoid text
overlap, low contrast, and layouts that break under zoom.

For performance, do not guess. Avoid expensive render work. Keep renderer state
local unless it must be shared. Bound histories, logs, tool outputs, and agent
transcripts before sending them to the model or renderer. Keep Electron startup
work lazy where practical.

For reliability, long-running operations need cancellation or timeouts. Tool,
connector, provider, and IPC failures should return typed errors that can be
shown safely. Persisted migrations must be backward compatible or include repair
logic. Background jobs need idempotency or duplicate execution protection.

For UX, primary workflows should work without reading instructions. Destructive
actions need confirmation and clear consequence text. Loading, empty, error, and
permission-denied states must be explicit. Operational screens should be dense,
scannable, and state-forward.

## Verification

Run the narrowest command that proves your change first. Then run broader checks
when the scope warrants it.

```bash
yarn typecheck
yarn lint
yarn test:main
yarn test:renderer
yarn quality:check
```

Use targeted tests for focused changes. Use `yarn quality:check` when the change
crosses multiple standards categories or touches broad shared behavior.

For renderer accessibility changes, add Testing Library assertions for roles,
names, and keyboard flows.

For privileged operations, tests must cover both denied and allowed paths.

## Final Response

Lead with what changed. Then list verification and remaining risk.

Include:

- Changed areas and files.
- Standards categories addressed.
- Verification commands run and whether they passed.
- Any verification you did not run, with the reason.
- Remaining risks or the next highest-value standards pass.

Do not claim full standards compliance unless you verified it. Do not hide
blocked checks. Keep the report concise and grounded in file paths and command
results.
