# OpenClaw Memory Source Map

Source tree: `/Users/haraldbregu/Documents/analyze/openclaw`

## Public Concept Docs

- `docs/concepts/memory.md` - user-facing overview of files, tools, backends,
  flush, and dreaming.
- `docs/concepts/memory-builtin.md` - builtin SQLite backend behavior.
- `docs/concepts/memory-qmd.md` - QMD sidecar behavior.
- `docs/concepts/memory-search.md` - search, provider, hybrid retrieval, and
  tuning overview.
- `docs/concepts/active-memory.md` - proactive recall plugin behavior.
- `docs/concepts/dreaming.md` - optional background consolidation.
- `docs/reference/memory-config.md` - configuration reference.
- `docs/cli/memory.md` - CLI commands.

## Core Runtime Wiring

- `src/plugins/memory-state.ts` - in-process registry for the active memory
  capability, corpus supplements, prompt supplements, flush plan resolver, and
  public artifacts.
- `src/plugins/memory-runtime.ts` - resolves and loads the active memory plugin
  runtime, then returns the active `MemorySearchManager`.
- `src/plugins/memory-embedding-providers.ts` - registered embedding provider
  adapter registry and plugin capability lookup.
- `src/agents/memory-search.ts` - per-agent memory search config merge and
  validation.
- `src/agents/system-prompt.ts` - inserts the active memory prompt section into
  agent bootstrap/system prompt construction.
- `src/gateway/server-startup-memory.ts` - optional QMD startup sync for agents.

## Plugin Entry Points

- `extensions/memory-core/index.ts` - registers the `memory-core` plugin
  capability, memory tools, CLI, dreaming command, and embedding providers.
- `extensions/memory-core/src/runtime-provider.ts` - adapts memory-core manager
  creation into the `MemoryPluginRuntime` contract.
- `extensions/active-memory/index.ts` - registers proactive recall through the
  `before_prompt_build` hook.

## Tool Layer

- `extensions/memory-core/src/tools.ts` - implements `memory_search` and
  `memory_get`.
- `extensions/memory-core/src/tools.shared.ts` - common tool schema, context
  resolution, manager lookup, unavailable-result shape, and supplement lookup.
- `extensions/memory-core/src/tools.citations.ts` - citation mode, citation
  formatting, and injected character clamping.
- `extensions/memory-core/src/session-search-visibility.ts` - filters session
  memory hits by requester visibility.
- `extensions/memory-core/src/prompt-section.ts` - emits model instructions for
  memory tool use.

## Builtin SQLite Backend

- `extensions/memory-core/src/memory/search-manager.ts` - selects QMD or builtin
  manager, caches QMD managers, applies QMD fallback to builtin, and closes
  managers.
- `extensions/memory-core/src/memory/manager.ts` - builtin
  `MemoryIndexManager`, search entry point, status, vector probes, and manager
  lifecycle.
- `extensions/memory-core/src/memory/manager-sync-ops.ts` - index sync,
  full/atomic reindex, watches, session dirty tracking, interval sync, and
  fallback provider activation.
- `extensions/memory-core/src/memory/manager-embedding-ops.ts` - chunk
  embedding, batch embedding, cache usage, chunk writes, FTS writes, vector
  writes, and multimodal handling.
- `extensions/memory-core/src/memory/manager-search.ts` - vector and FTS query
  helpers.
- `extensions/memory-core/src/memory/hybrid.ts` - vector/keyword merge,
  weighting, temporal decay, and MMR handoff.
- `extensions/memory-core/src/memory/manager-db.ts` - opens/closes SQLite with
  WAL maintenance and busy timeout.
- `extensions/memory-core/src/memory/manager-sync-control.ts` - readonly
  database recovery and targeted session sync queuing.

## Shared Memory Host SDK

- `packages/memory-host-sdk/src/host/types.ts` - `MemorySearchManager`,
  result, status, source, and probe contracts.
- `packages/memory-host-sdk/src/host/memory-schema.ts` - SQLite tables and FTS
  schema.
- `packages/memory-host-sdk/src/host/internal.ts` - file discovery, file
  entries, Markdown chunking helpers, multimodal chunk construction, hashing,
  and path normalization.
- `packages/memory-host-sdk/src/host/read-file.ts` - guarded memory file reads
  and per-agent read helper.
- `packages/memory-host-sdk/src/host/read-file-shared.ts` - bounded excerpt and
  truncation result construction.
- `packages/memory-host-sdk/src/host/backend-config.ts` - resolves builtin vs
  QMD backend and QMD collections/settings.
- `packages/memory-host-sdk/src/host/session-files.ts` - converts session JSONL
  transcripts into sanitized text for indexing.
- `packages/memory-host-sdk/src/host/sqlite.ts` and
  `packages/memory-host-sdk/src/host/sqlite-vec.ts` - SQLite/WAL and vector
  extension loading.
- `packages/memory-host-sdk/src/host/embedding-*.ts` and
  `packages/memory-host-sdk/src/host/embeddings*.ts` - provider-independent
  embedding input, limits, defaults, remote/local providers, and vector
  normalization.

## QMD Backend

- `extensions/memory-core/src/memory/qmd-manager.ts` - QMD manager, collection
  reconciliation, sidecar update/embed scheduling, direct CLI search, mcporter
  search, result path resolution, read guards, status, and cleanup.
- `extensions/memory-core/src/memory/qmd-compat.ts` - QMD collection flag
  compatibility.
- `packages/memory-host-sdk/src/host/qmd-process.ts` - QMD process spawn and
  availability checks.
- `packages/memory-host-sdk/src/host/qmd-query-parser.ts` - parses QMD JSON
  result output and tolerates no-result/noisy output.
- `packages/memory-host-sdk/src/host/qmd-scope.ts` - QMD session scope rules.

## Memory Flush

- `extensions/memory-core/src/flush-plan.ts` - builds default or configured
  pre-compaction memory flush prompt and target daily file.
- `src/auto-reply/reply/memory-flush.ts` - context-window threshold helpers and
  duplicate-flush guard.
- `src/auto-reply/reply/agent-runner-memory.ts` - decides when to run the flush
  and launches the silent embedded agent turn.

## Active Memory

- `extensions/active-memory/index.ts` - config normalization, session
  eligibility, prompt/query construction, temporary sub-agent execution, result
  caching, timeout/circuit breaker handling, status persistence, and
  `before_prompt_build` injection.
- `src/agents/harness/prompt-compaction-hook-helpers.ts` - runs
  `before_prompt_build` and legacy `before_agent_start` hooks for harnesses.
- `src/agents/harness/hook-context.ts` - converts run metadata into plugin hook
  context.

## Dreaming And Promotion

- `extensions/memory-core/src/dreaming.ts` - managed dreaming cron, command
  registration helpers, sweep orchestration, and legacy cron migration.
- `extensions/memory-core/src/dreaming-phases.ts` - light, REM, and deep phase
  behavior.
- `extensions/memory-core/src/short-term-promotion.ts` - recall store,
  ranking, thresholding, MEMORY.md promotion, locks, and audits.
- `extensions/memory-core/src/dreaming-markdown.ts` - Dream Diary and phase
  report rendering.
- `extensions/memory-core/src/dreaming-narrative.ts` - optional narrative diary
  generation.

## Provider Plugins

Memory embedding adapters are implemented by provider plugins, for example:

- `extensions/openai/memory-embedding-adapter.ts`
- `extensions/google/memory-embedding-adapter.ts`
- `extensions/voyage/memory-embedding-adapter.ts`
- `extensions/mistral/memory-embedding-adapter.ts`
- `extensions/deepinfra/memory-embedding-adapter.ts`
- `extensions/ollama/src/memory-embedding-adapter.ts`
- `extensions/lmstudio/memory-embedding-adapter.ts`

The active memory engine consumes all of them through the adapter contract in
`src/plugins/memory-embedding-providers.ts` and
`packages/memory-host-sdk/src/host/openclaw-runtime-memory.ts`.

