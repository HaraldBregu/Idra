# Tool Runtime Refactor Implementation Plan

## Goal

Make provider-facing tool execution use one canonical tool boundary without moving or rewriting every existing local tool implementation.

The refactor is intentionally adapter-based. Existing local tools, connector tools, sessions, and transcript data remain in place.

## Success Criteria

1. Active agent runs normalize tool schemas before sending them to providers.
2. Active agent runs expose provider-safe tool names and still execute the original tool implementation.
3. Legacy `schema`/`execute(args, ctx)` tools can be adapted to canonical `parameters`/`execute(toolCallId, params, signal)` tools.
4. Canonical image results and legacy provider transcript image blocks are converted consistently.
5. The implementation has focused tests around the provider-facing adapter behavior.

## Implementation Plan

1. Add a legacy/canonical adapter in `src/main/tools/runtime`.
   - Verify: unit coverage for provider-safe names, schema normalization, and result conversion.
2. Route active agent tools through the adapter before provider requests and prompt generation.
   - Verify: agent run and service tests prove provider schemas/names are normalized, prompts use the provider-safe aliases, and original tools execute.
3. Preserve existing tool selection and injected `toolsFactory` behavior.
   - Verify: existing agent and tool tests continue to pass.
4. Wire the default `AgentService` tool factory into canonical `createAgentTools`.
   - Verify: service/tool-runtime tests prove host tools are accepted without duplicate built-ins.
5. Keep full canonical migration as a separate later step.
   - Verify: no file moves and no store/session migrations.

## Follow-Up Work

- Replace misleading non-blocking approval behavior with a real confirmation policy or rename it.
- Move shell execution behind a narrower command-runner adapter.
- Add provider capability metadata for schema strictness, image tool results, and hosted tools.
