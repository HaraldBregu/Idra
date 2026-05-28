# Connector Runtime Refactor And Test Plan

## Goal

Refactor the current connector runtime so agents can safely use connector tools across multi-provider, multi-model runs through the existing provider-neutral tool contract.

This plan improves the current production path. It does not introduce a replacement connector runtime, patch around failures, or migrate stored connector settings.

## Current Production Path

The active runtime is:

1. `src/main/bootstrap.ts` registers `ConnectorsService`.
2. `src/main/service.ts` adds `connectors.createAgentTools()` to the agent tool set.
3. `src/main/agent/run.ts` passes selected tools as provider-neutral tool specs.
4. Provider adapters translate those tool specs for OpenAI, Anthropic, Mistral, DeepSeek, Qwen, or OpenAI-compatible APIs.

The larger `src/main/connectors/integration.ts` layer contains useful concepts, but it is not the registered production path. Treat it as reference material, not as a migration target.

## Success Criteria

1. Agents only receive executable connector tools.
2. Connector tools remain model-provider independent.
3. Google Gmail, Google Calendar, and Google Drive continue to work with existing saved connector records.
4. Catalog-only connectors remain visible in settings/catalog UI but are not exposed as executable agent tools.
5. Approval metadata is either enforced by a real execution gate or not presented as approval behavior.
6. Connector implementation details are split into small, testable strategies without changing public IPC or store shape.
7. Tests cover agent-level tool exposure, connector execution, and provider-neutral model routing.

## Non-Goals

- No store migration.
- No IPC API replacement.
- No UI rewrite.
- No new dependency injection container.
- No broad adoption of `integration.ts` as a second runtime.
- No provider-specific connector branching inside agent run logic.

## Refactor Strategy

Use one primary pattern: strategy.

Each executable connector gets a small runtime strategy behind a common interface. `ConnectorsService` remains the facade used by IPC and agents, but it delegates execution and tool metadata to connector strategies.

Suggested internal boundary:

```ts
interface ConnectorRuntimeStrategy {
  readonly connectorId: ConnectorConfig['connectorId'];
  listTools(connector: ConnectorConfig): ConnectorTool[];
  status(connector: ConnectorConfig): ConnectorStatus;
  callTool(connector: ConnectorConfig, name: string, args: unknown): Promise<unknown>;
}
```

Keep construction manual in `ConnectorsService` or a small local factory. Do not add a DI framework.

## Phase 1: Lock Current Behavior With Tests

Implementation:

1. Add tests proving Google connector tools are exposed to `AgentService.send()` through `createAgentTools()`.
2. Add tests proving Dropbox, Microsoft Teams, Outlook, and SharePoint catalog entries are not exposed as agent tools while local runtime execution is missing.
3. Add tests proving configured-but-not-executable connectors return a clear catalog/settings status and cannot be called as local tools.
4. Add tests proving the same connector tools are passed to different provider adapters as normal `ProviderToolSpec` values.

Verification:

- `npm test -- tests/unit/main/services/services.test.ts tests/unit/main/agent/service.test.ts`
- Add focused connector tests before extracting strategy code.

## Phase 2: Separate Catalog From Runtime Capability

Implementation:

1. Add a runtime capability check in `ConnectorsService`.
2. Keep `catalog()` returning every catalog item.
3. Make `createAgentTools()` include only connectors with a registered local strategy.
4. Make `callTool()` fail before status says "configured" for catalog-only connectors, with a precise error such as `Connector is catalog-only in local runtime`.
5. Keep existing saved connector records readable as-is.

Verification:

- Catalog-only connector records can still be listed and updated.
- Catalog-only connector tools are not sent to the agent loop.
- Google connector behavior is unchanged.

## Phase 3: Extract Google Runtime Strategies

Implementation:

1. Move Gmail execution into a Gmail strategy.
2. Move Google Calendar execution into a Calendar strategy.
3. Move Google Drive execution into a Drive strategy.
4. Keep shared OAuth token refresh in a small Google auth helper used by all three strategies.
5. Keep schemas and descriptions next to each strategy unless duplication becomes meaningful.

Verification:

- Existing Gmail, Calendar, and Drive service tests pass unchanged or with minimal expectation updates.
- Add contract-style tests for each strategy:
  - `listTools()` respects `allowedTools`.
  - `callTool()` validates required args.
  - projected output remains stable.

## Phase 4: Fix Approval Semantics

Implementation:

1. Define connector risk categories from tool metadata: read, draft/write-private, external-write, destructive.
2. Make `needsApproval` meaningful only when the execution layer can block.
3. If blocking approval is not available in this refactor, rename the connector field usage internally to risk metadata and stop presenting it as an execution gate.
4. Add a real confirmation seam later through the existing tool management path.

Verification:

- External-write and destructive connector tools are not silently treated as approved.
- Tests assert that approval-required tools either block or are not exposed as approved.

## Phase 5: Provider-Neutral Agent Coverage

Implementation:

1. Add tests with fake provider adapters for at least two provider IDs.
2. Assert connector tools arrive as provider-neutral `ProviderToolSpec` values.
3. Assert connector execution goes through `AgentTool.execute`, not provider-specific branches.
4. Assert provider/model overrides still select the requested model while keeping connector tools available.

Verification:

- Agent tests cover OpenAI-like and Anthropic-like runs with the same connector tool.
- No connector code imports provider adapters.

## Phase 6: Remove Or Fence Prototype Runtime Usage

Implementation:

1. Leave `integration.ts` untouched if tests still depend on it, but document it as non-production reference.
2. Avoid importing `connectors.config.ts` into production until there is a clear composition decision.
3. If future work adopts parts of `integration.ts`, move concepts incrementally into the active `ConnectorsService` path.

Verification:

- `rg "ConnectorAgentIntegration|connectorsConfig" src/main` shows no accidental production wiring unless intentionally added.
- Production connector tests remain focused on `ConnectorsService`.

## Test Matrix

| Area | Test |
| --- | --- |
| Catalog | All catalog entries remain available through IPC/service catalog. |
| Runtime exposure | Only locally implemented connectors produce agent tools. |
| Agent path | `AgentService.send()` includes configured Google connector tools for relevant requests. |
| Provider neutrality | Same connector tool spec is sent with different provider/model selections. |
| OAuth | Google OAuth refresh still updates stored access tokens without storing client secrets. |
| Argument validation | Missing IDs, invalid dates, and wrong argument types fail before API calls. |
| Output projection | Gmail, Calendar, and Drive outputs remain trimmed and stable. |
| Approval/risk | External-write/destructive tools are not silently auto-approved. |
| Store compatibility | Existing connector settings read and write without migration. |

## Rollout Order

1. Add failing or characterization tests for current runtime boundaries.
2. Add local runtime capability checks.
3. Extract strategies for Gmail, Calendar, and Drive one at a time.
4. Tighten approval/risk semantics.
5. Add provider-neutral agent integration tests.
6. Update docs when catalog-only connectors become executable.

## Done Definition

The refactor is complete when `ConnectorsService` is still the single production facade, connector execution is delegated to small strategies, catalog-only connectors are not exposed as agent tools, and the test suite proves the same connector tools work through multi-provider agent runs without store migration.
