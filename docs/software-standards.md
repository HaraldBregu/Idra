# Software Standards

This document defines the minimum professional standard for Friday. It is intentionally concrete: changes should be small, verifiable, and tied to one of these standards.

## 1. Code Quality

- Keep TypeScript strict and prefer explicit interfaces at module boundaries.
- Keep provider, connector, storage, UI, and IPC responsibilities separate.
- Avoid global mutable state in business logic; inject services and adapters.
- Do not add abstractions for one-off code.
- Remove dead code introduced by a change.

Verification:

```bash
yarn typecheck
yarn lint
```

## 2. Security

- Browser windows must use `WindowFactory` unless there is a documented exception.
- Preload APIs must be minimal, typed, and permission-aware.
- Main-process IPC must validate input and own authorization decisions.
- File, shell, app, connector, and network actions must check scope and intent.
- Secrets must be redacted before logging, storing, or sending to the renderer.

Implementation rule: any new privileged operation needs a test for denied access and a test for allowed access.

## 3. Accessibility

- Interactive controls must be keyboard reachable.
- Icon-only buttons need accessible names or tooltips that do not replace the accessible label.
- Forms need labels, validation text, and clear focus behavior.
- Avoid text overlap, low contrast, and viewport-only layouts that break zoom.

Verification:

```bash
yarn test:renderer
```

For high-impact UI changes, add Testing Library assertions for roles, names, and keyboard flows.

## 4. Performance

- Keep renderer state local unless shared state is required.
- Avoid expensive work during render; memoize only when measurement or repeated work justifies it.
- Bound histories, logs, tool outputs, and assistant transcripts before sending to the model or renderer.
- Keep Electron startup work lazy where possible.

Verification: profile before optimizing, and add regression tests for bounded lists or cached work.

## 5. Reliability

- Long-running operations need cancellation or timeout behavior.
- Tool, connector, provider, and IPC failures should return typed errors that can be shown safely.
- Persisted data migrations must be backward compatible or include repair logic.
- Background jobs need idempotency or duplicate execution protection.

Verification: add tests for failure paths, not only successful paths.

## 6. API Design

- Public APIs should use small behavior-oriented interfaces.
- Shared IPC types belong in `src/shared`; preload should unwrap typed IPC and expose stable methods.
- Provider-specific logic belongs behind provider adapters.
- Storage implementations must sit behind repository/store interfaces.

Breaking API changes require test updates and documentation in the pull request.

## 7. Documentation

- New services need a short note in README or a colocated module README when the ownership boundary is not obvious.
- Security, privacy, permissions, and release behavior must be documented before release.
- Public setup steps must stay copy-pasteable.

## 8. DevOps and Deployment

- CI must run typecheck, lint, and tests.
- Dependabot monitors npm and GitHub Actions dependencies.
- Builds must run from a clean dependency install.
- Desktop release jobs must verify signing/notarization expectations before distribution.

## 9. Data Privacy

- Classify data before storing it: public, personal, private, sensitive, or secret.
- Do not persist secrets in assistant memory or logs.
- Provide export and deletion paths for user memory and local state where practical.
- Store only data required for the feature and document retention expectations.

See [privacy-and-data.md](privacy-and-data.md).

## 10. User Experience

- Primary workflows should be reachable without reading instructions.
- Destructive actions need confirmation and clear consequence text.
- Loading, empty, error, and permission-denied states must be explicit.
- Keep operational screens dense but scannable; avoid decorative UI that hides state.

## 11. Testing and Maintainability

- Add focused tests for bug fixes before or with the fix.
- Prefer testing public seams over private implementation details.
- Keep fixtures small and readable.
- New architecture boundaries need at least one test proving the seam can be replaced or denied.

Minimum merge gate:

```bash
yarn quality:check
```

## Current Risk Register

- Credential and connector handling require regular review because this app bridges local files, external services, and AI tools.
- Renderer accessibility coverage should expand as UI workflows stabilize.
- Automated packaging/release verification is not yet represented in CI.
- Privacy export/delete behavior exists in some modules but should be made user-visible across all sensitive stores.
