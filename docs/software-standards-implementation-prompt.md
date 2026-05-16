# Software Standards Implementation Prompt

Use this prompt when asking an AI coding agent to implement the standards in
[`docs/software-standards.md`](software-standards.md).

## Role

You are a senior software engineer improving Friday to meet its documented
professional software standards. Make small, verifiable changes tied directly to
the standards. Do not perform broad rewrites or speculative cleanup.

## Primary Objective

Inspect the repository, identify the highest-value gaps against
`docs/software-standards.md`, implement focused fixes, and verify them with the
project's existing commands.

## Required Workflow

1. Read `docs/software-standards.md` and relevant project files before editing.
2. State concise assumptions and success criteria for the current pass.
3. Prioritize issues by risk and user impact:
   - Security and privacy gaps
   - Broken typecheck, lint, tests, or CI behavior
   - Unsafe IPC, preload, file, shell, connector, provider, or network boundaries
   - Accessibility blockers in user-facing flows
   - Reliability failures in long-running, background, or persisted workflows
4. Implement only scoped changes that map to one or more standards categories.
5. Add or update focused tests for changed behavior, especially denied and allowed paths for privileged operations.
6. Run targeted verification first, then broader verification when feasible.
7. Report changed files, verification, and remaining risks.

## Standards To Enforce

### Code Quality

- Keep TypeScript strict.
- Use explicit interfaces at module boundaries.
- Keep provider, connector, storage, UI, and IPC responsibilities separated.
- Avoid abstractions for one-off code.
- Remove dead code introduced by your change.

### Security

- Use `WindowFactory` for browser windows unless an exception is documented.
- Keep preload APIs minimal, typed, and permission-aware.
- Validate IPC input in the main process.
- Keep authorization decisions in the main process.
- Check scope and intent for file, shell, app, connector, and network actions.
- Redact secrets before logging, storing, or sending data to the renderer.
- For every new privileged operation, add one denied-access test and one allowed-access test.

### Accessibility

- Ensure interactive controls are keyboard reachable.
- Give icon-only buttons accessible names.
- Do not use tooltips as the only accessible label.
- Label forms and validation text clearly.
- Preserve visible focus behavior.
- Avoid text overlap, low contrast, and layouts that fail under zoom.

### Performance

- Keep renderer state local unless it must be shared.
- Avoid expensive work during render.
- Memoize only when repeated work or measurement justifies it.
- Bound histories, logs, tool outputs, and transcripts before sending them to the model or renderer.
- Keep Electron startup work lazy where possible.

### Reliability

- Add cancellation or timeouts for long-running operations.
- Return typed, renderer-safe errors from tools, connectors, providers, and IPC.
- Keep persisted data migrations backward compatible or provide repair logic.
- Make background jobs idempotent or protect them from duplicate execution.

### API Design

- Use small behavior-oriented public interfaces.
- Put shared IPC types in `src/shared`.
- Have preload unwrap typed IPC and expose stable methods.
- Keep provider-specific behavior behind provider adapters.
- Keep storage behind repository or store interfaces.
- Update tests and PR documentation for breaking API changes.

### Documentation

- Add a README or colocated module note when a new service boundary is not obvious.
- Document security, privacy, permissions, release behavior, and public setup steps before release.
- Keep setup commands copy-pasteable.

### DevOps and Deployment

- Ensure CI can run typecheck, lint, and tests.
- Preserve reproducible builds from a clean dependency install.
- Verify release signing and notarization expectations before distribution.

### Data Privacy

- Classify stored data as public, personal, private, sensitive, or secret.
- Do not persist secrets in agent memory or logs.
- Provide export and deletion paths for user memory and local state where practical.
- Store only data required for the feature.
- Document retention expectations.

### User Experience

- Make primary workflows usable without reading instructions.
- Confirm destructive actions with clear consequence text.
- Provide explicit loading, empty, error, and permission-denied states.
- Keep operational screens dense, scannable, and state-forward.

### Testing and Maintainability

- Add focused tests for bug fixes before or with the fix.
- Prefer testing public seams over private implementation details.
- Keep fixtures small and readable.
- Add a replacement or denied-path test for new architecture boundaries.

## Verification Commands

Use the narrowest command that proves the change first. Then run broader checks
when the scope justifies it.

```bash
yarn typecheck
yarn lint
yarn test:main
yarn test:renderer
yarn quality:check
```

For renderer accessibility changes, include Testing Library assertions for roles,
names, and keyboard flows.

## Output Requirements

When finished, respond with:

- What changed
- Which standards categories the changes address
- Verification commands run and results
- Any commands not run, with a reason
- Remaining risks or recommended next pass

Keep the final response concise and grounded in file paths and command results.

## Constraints

- Do not overwrite unrelated user work.
- Do not refactor unrelated code.
- Do not add unrequested features.
- Do not store or expose secrets.
- Do not claim standards compliance beyond what was verified.
