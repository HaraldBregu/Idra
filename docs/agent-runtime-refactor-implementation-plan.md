# Agent Runtime Refactor Implementation Plan

## Goal

Refactor the agent runtime so tools, skills, MCP, connectors, plugins, and multi-provider model adapters are composed through explicit capability boundaries instead of parallel legacy paths.

This plan intentionally avoids data migrations. Existing settings, sessions, and provider records remain readable as-is.

## Success Criteria

1. Normal agent runs use one canonical tool assembly path.
2. Local tools, connector tools, MCP tools, plugin tools, and deferred tool-search controls are represented by one runtime contract before being adapted to any provider.
3. Provider adapters declare what they support, such as function tools, native MCP, hosted skills, local skill execution, reasoning controls, and multimodal tool results.
4. Skills can run either as provider-native attachments when supported or as local prompt/tool fallbacks when not supported.
5. Approval semantics are explicit: tools either have a real confirmation gate or no approval claim is exposed.
6. Tests cover the normal `AgentService.send()` path, not only low-level helper modules.

## Non-Goals

- No store migrations.
- No transcript format migration.
- No replacement of all provider adapters in one pass.
- No broad UI rewrite.

## Phase 1: Canonical Tool Assembly In AgentService

Problem: `AgentService` currently builds local tools plus connector tools directly, while `createAgentTools` already contains the newer policy, MCP, plugin, LSP, and tool-search assembly logic.

Implementation:

1. Add a bridge from canonical runtime tools to the legacy `runAgent` tool contract.
2. Add a bridge from legacy connector tools into canonical runtime tools so connectors can pass through the same policy pipeline.
3. Extend `createAgentTools` with host-provided tools that are neither client-hosted nor plugin-owned.
4. Replace the default `AgentService` tool factory with `createAgentTools`.
5. Preserve injected `toolsFactory` behavior for tests and custom callers.

Verification:

- Existing agent service tests still pass.
- Add a test proving the default service path exposes connector tools through the canonical assembly.

## Phase 2: Provider Capability Contract

Problem: providers are selected by id, but runtime behavior is inferred from adapter internals.

Implementation:

1. Add optional capability metadata to `ProviderAdapter`.
2. Declare support for function tools, native hosted MCP, reasoning controls, skill attachments, image tool results, and strict-schema limitations.
3. Use those capabilities when building provider requests.
4. Normalize provider-specific reasoning effort support outside `AgentService`.

Verification:

- Provider tests assert capability metadata for OpenAI, Anthropic, Mistral, DeepSeek, Qwen, and OpenAI-compatible fallback.
- Unsupported provider capability requests fail before the API call.

## Phase 3: Connectors And MCP

Problem: OpenAI native MCP connector records and local connector tools are separate, and non-Google connectors can be exposed without executable local strategies.

Implementation:

1. Separate connector exposure modes:
   - local executable connector tools
   - provider-native hosted MCP tools
   - deferred connector catalogs
2. Expose only locally implemented connector tools through the local tool path.
3. Send native hosted MCP only to providers that declare support.
4. Keep connector approval and allowed-tool metadata intact across both modes.

Verification:

- Google connector local tools execute through the normal agent path.
- Non-local connector tools are not exposed as executable local tools.
- OpenAI hosted MCP tools are only attached for OpenAI-capable requests.

## Phase 4: Skills

Problem: skills are discovered and described in the prompt, but provider-native skill attachment adapters are unused.

Implementation:

1. Introduce a skill routing step after discovery.
2. Attach skills natively for providers that support the selected route.
3. Fall back to reading `SKILL.md` or `execute_skill` for providers without native support.
4. Pass connector capabilities into skill discovery and execution contexts.

Verification:

- Provider-native skill attachment payloads are tested for OpenAI and Anthropic.
- Connector-required skills can discover and execute when the connector is available.
- Prompt fallback remains available for unsupported providers.

## Phase 5: Approvals And Hooks

Problem: `needsApproval` is treated as legacy metadata and does not block execution. Harness hook helpers exist but are not connected to the main run path.

Implementation:

1. Decide the approval policy surface and wire it into tool execution.
2. Rename or remove misleading approval fields if execution remains non-blocking.
3. Register plugin hook providers from the plugin registry.
4. Fire lifecycle hooks from the main run path at prompt build, LLM input/output, tool result, message write, compaction, and agent end.
5. Apply tool-result middleware before tool results are persisted into transcripts.

Verification:

- High-impact tools can be blocked by approval policy.
- Hook failures are isolated.
- Tool-result middleware cannot return oversized or invalid content.

## Phase 6: Run-Loop Cleanup

Problem: the agent still has legacy and canonical runtime types in parallel.

Implementation:

1. Move `runAgent` to canonical tool definitions.
2. Remove the temporary bridge once callers use canonical tools directly.
3. Keep provider transcript conversion as the single provider-neutral boundary.
4. Add integration coverage for multi-tool, multi-provider turns.

Verification:

- Existing transcript persistence behavior remains unchanged.
- OpenAI, Anthropic, Mistral, DeepSeek, Qwen, and OpenAI-compatible tests pass.
- Tool-search deferred execution works through `AgentService.send()`.
