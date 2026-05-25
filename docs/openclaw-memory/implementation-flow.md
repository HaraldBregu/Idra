# OpenClaw Memory Implementation Flow

This is the step-by-step path through OpenClaw memory as implemented in the
scraped source tree.

## 1. Workspace Files Are The Source Of Truth

OpenClaw treats memory as normal files in the agent workspace.

- `MEMORY.md` is the canonical root memory file.
- `memory/*.md` contains daily or working notes.
- `DREAMS.md` plus `memory/.dreams/` store optional dreaming output and machine
  state.

`src/memory/root-memory-files.ts` enforces `MEMORY.md` as canonical and skips
legacy or repair paths. `packages/memory-host-sdk/src/host/internal.ts` lists
indexable files by loading `MEMORY.md`, the `memory/` tree, configured
`extraPaths`, and optional multimodal files.

## 2. The Memory Plugin Registers The Runtime

`extensions/memory-core/index.ts` is the main entry point. During plugin
registration it:

- registers builtin embedding providers,
- registers dreaming support,
- registers the exclusive memory capability with prompt builder, flush plan,
  runtime adapter, and public artifacts,
- registers `memory_search` and `memory_get`,
- registers the `memory` CLI and `/dreaming` command.

Core code does not directly construct the memory plugin. It asks the active
memory slot for a runtime through `src/plugins/memory-runtime.ts`.

## 3. Prompt Guidance Is Added Only When Tools Exist

`extensions/memory-core/src/prompt-section.ts` builds the "Memory Recall"
prompt section. It checks whether `memory_search` and/or `memory_get` are
available, then emits guidance telling the agent to search before answering
questions about prior work, decisions, dates, people, preferences, or todos.

`src/agents/system-prompt.ts` calls `buildMemoryPromptSection`, so memory
instructions are part of the agent system context only when the active memory
plugin contributed them.

## 4. Config Is Resolved Per Agent

`src/agents/memory-search.ts` merges default and per-agent `memorySearch`
settings. The resolved config includes:

- enabled flag,
- sources (`memory` and optionally `sessions`),
- embedding provider, fallback, model, input type, and remote/local settings,
- SQLite store path and FTS/vector settings,
- chunk size and overlap,
- watch, session-start, search-time, interval, and batch sync settings,
- query limits, hybrid weights, MMR, temporal decay, and cache settings.

The SQLite path defaults to `~/.openclaw/memory/<agentId>.sqlite`.

## 5. The Active Backend Is Selected

`src/plugins/memory-runtime.ts` loads the active memory plugin and calls its
runtime. `extensions/memory-core/src/runtime-provider.ts` forwards that request
to `extensions/memory-core/src/memory/search-manager.ts`.

`search-manager.ts` chooses:

- `QmdMemoryManager` when `memory.backend` resolves to `qmd` and QMD can be
  opened.
- `MemoryIndexManager` for the builtin SQLite backend.
- builtin fallback when QMD fails or later errors during search.

QMD manager instances are cached per agent and config identity. Recent QMD open
failures are put on a short cooldown to avoid retry storms in chat turns.

## 6. Builtin Backend Opens SQLite And Ensures Schema

`extensions/memory-core/src/memory/manager.ts` creates `MemoryIndexManager`.
It opens the SQLite database through `manager-db.ts`, enables WAL maintenance,
sets `busy_timeout`, and calls `ensureMemoryIndexSchema`.

`packages/memory-host-sdk/src/host/memory-schema.ts` creates:

- `meta` for index metadata,
- `files` for indexed file hashes,
- `chunks` for chunk text and embeddings,
- optional `embedding_cache`,
- optional FTS5 table `chunks_fts`.

`sqlite-vec` is loaded lazily. If vector storage cannot load, the builtin
backend still keeps FTS search working.

## 7. Builtin Sync Builds Or Refreshes The Index

`extensions/memory-core/src/memory/manager-sync-ops.ts` owns sync.

On full reindex it builds a temporary SQLite database and swaps it into place
atomically. Incremental sync updates only changed or dirty files.

Memory file indexing does this:

1. `listMemoryFiles` finds `MEMORY.md`, `memory/*.md`, extra paths, and
   multimodal files if enabled.
2. `buildFileEntry` records path, size, mtime, hash, and optional multimodal
   metadata.
3. `indexFile` chunks Markdown with about the configured token size and overlap.
4. Empty chunks are removed and oversized chunks are split to provider limits.
5. Embeddings are loaded from cache or requested from the active provider.
6. `writeChunks` writes rows into `chunks`, optional `chunks_vec`, and optional
   `chunks_fts`.
7. Stale file, vector, chunk, and FTS rows are deleted.

Sync can be triggered by search bootstrap, session start, file watches,
intervals, forced CLI/index commands, or session transcript deltas.

## 8. Embedding Providers Are Plugin-Owned Adapters

`src/plugins/memory-embedding-providers.ts` stores registered embedding
provider adapters. Provider plugins add adapters through the plugin API.

`extensions/memory-core/src/memory/embeddings.ts` creates the active provider:

- `provider: "auto"` tries adapters by `autoSelectPriority`.
- explicit providers use their adapter directly.
- fallback providers can replace a failing primary.
- local embeddings use the builtin `node-llama-cpp` adapter when configured.

Embedding cache keys include provider/model or runtime-specific cache data so
changing provider settings forces a correct reindex.

## 9. Builtin Search Runs FTS, Vector, Or Hybrid Retrieval

`MemoryIndexManager.search` in
`extensions/memory-core/src/memory/manager.ts` is the builtin search entry.

It first forces a sync if the index is empty, warms session sync if needed, and
starts an async sync if the index is dirty.

Search behavior:

- Without an embedding provider, it uses FTS-only search and boosted lexical
  fallback scoring.
- With a provider, it embeds the query, runs vector search, and optionally runs
  BM25/FTS keyword search.
- `extensions/memory-core/src/memory/hybrid.ts` merges vector and keyword
  results with configured weights.
- Temporal decay and optional MMR re-ranking can adjust result order.
- Results are filtered by min score and max result count.

Vector search uses `sqlite-vec` KNN when available. If not, it scans chunk
embeddings in process with cosine similarity.

## 10. `memory_search` Adds Tool-Level Behavior

`extensions/memory-core/src/tools.ts` implements `memory_search`.

The tool:

1. Resolves the current agent and manager.
2. Honors `corpus` values for indexed memory files and session transcripts.
3. Calls `manager.search`.
4. Filters session transcript hits through session visibility rules.
5. Adds citations when enabled or when direct-session auto mode applies.
6. Clamps QMD snippets to the configured injected-character budget.
7. Records short-term recall hits for dreaming promotion.
8. Returns provider/model/fallback/debug metadata with the results.

Unavailable providers return a structured disabled result with warning and
operator action text instead of throwing raw errors into the model.

## 11. `memory_get` Reads Bounded, Guarded Excerpts

`memory_get` also lives in `extensions/memory-core/src/tools.ts`.

For builtin memory it calls `readAgentMemoryFile`, which resolves workspace and
extra paths through `packages/memory-host-sdk/src/host/read-file.ts`. Reads are
allowed only for:

- memory files inside the workspace, or
- configured extra Markdown paths that pass symlink and containment checks.

For QMD, `QmdMemoryManager.readFile` accepts normal workspace memory paths and
virtual paths shaped like `qmd/<collection>/<relative-path>`. It verifies the
path stays inside the collection root before reading.

Both paths return bounded slices with truncation metadata and continuation
information.

## 12. Session Transcript Memory Is Optional And Sanitized

When `memorySearch.experimental.sessionMemory` enables the `sessions` source,
the builtin backend indexes session transcripts.

`packages/memory-host-sdk/src/host/session-files.ts` converts JSONL transcripts
into sanitized Markdown-like text:

- only user and assistant content is exported,
- inbound channel metadata and internal runtime context are stripped,
- heartbeat, cron, silent replies, generated system wrappers, and tool noise are
  skipped,
- sensitive text is redacted,
- long lines are wrapped,
- source JSONL line numbers are preserved through `lineMap`.

`extensions/memory-core/src/session-search-visibility.ts` filters session hits
so a requester only sees transcripts allowed by session visibility and
agent-to-agent policy.

## 13. QMD Backend Uses Managed Collections And A Sidecar

QMD is implemented in `extensions/memory-core/src/memory/qmd-manager.ts`.

When enabled, `resolveMemoryBackendConfig` builds managed QMD collections:

- root `MEMORY.md`,
- the `memory/` directory,
- configured `memory.qmd.paths`,
- `memorySearch.extraPaths`,
- optional exported session transcripts.

`QmdMemoryManager` creates per-agent QMD state under
`~/.openclaw/agents/<agentId>/qmd/`, sets QMD XDG directories, symlinks shared
models when possible, ensures collections through `qmd collection add`, and
runs `qmd update` plus `qmd embed` according to config.

Search runs through either:

- direct `qmd search`, `qmd vsearch`, or `qmd query`, or
- `mcporter` MCP calls when `memory.qmd.mcporter.enabled` is true.

The manager parses JSON results, resolves QMD document ids back to safe paths,
diversifies memory/session results, clamps snippet budgets, and exposes QMD
status as a `MemorySearchManager`.

If QMD is missing, broken, busy, or fails during use, `search-manager.ts` wraps
it with builtin fallback.

## 14. Active Memory Is A Proactive Recall Layer

`extensions/active-memory/index.ts` is separate from the storage backend.

It registers a `before_prompt_build` hook. For eligible sessions it:

1. Checks plugin enablement, targeted agent ids, chat type, chat id filters, and
   session toggle state.
2. Extracts recent user/assistant turns.
3. Builds a bounded memory search query.
4. Runs a temporary embedded sub-agent with only memory tools allowed.
5. Uses the current run model, configured active-memory model, agent default, or
   last-resort fallback.
6. Normalizes the sub-agent reply into a compact summary.
7. Injects the summary as hidden untrusted context before the main prompt.
8. Persists optional debug/status lines into the session store.

It has caching, timeout handling, partial timeout recovery, and a circuit
breaker for repeated model timeouts. It never stores memory itself; it only
surfaces memory before the main reply.

## 15. Pre-Compaction Flush Saves Important Context

`extensions/memory-core/src/flush-plan.ts` builds a memory flush plan. The plan
contains threshold settings, the target daily file path, and prompts that tell
the agent to append durable memories to `memory/YYYY-MM-DD.md`.

`src/auto-reply/reply/agent-runner-memory.ts` gates the flush before compaction.
It compares projected context size with the model context window, reserve, and
soft threshold. It also supports a force path when active transcript bytes are
large.

When triggered, it runs a silent embedded agent turn with the flush prompt. The
target is the daily memory file, and root/bootstrap files are treated as
read-only during the flush.

## 16. Dreaming Promotes Recalled Short-Term Signals

Dreaming is optional and disabled by default.

`extensions/memory-core/src/tools.ts` records surfaced `memory_search` hits via
`recordShortTermRecalls`. `extensions/memory-core/src/short-term-promotion.ts`
stores recall counts, query diversity, recency, scores, concept tags, and phase
signals under `memory/.dreams/`.

`extensions/memory-core/src/dreaming.ts` manages the cron job and sweep. The
light/REM/deep phases write human-readable reports to `DREAMS.md` or
`memory/dreaming/`, and the deep phase can append qualified promoted entries to
`MEMORY.md`.

Promotion is gated by score, recall count, unique query count, recency, and
budgeting rules. Dreaming-generated narrative text is excluded from promotion
sources to avoid self-reinforcement.

## 17. Status And Startup Keep Memory Healthy

`src/gateway/server-startup-memory.ts` optionally starts QMD boot sync for
eligible agents. It avoids eagerly initializing every agent when multiple
agents exist unless config makes that necessary.

`extensions/memory-core/src/memory/manager.ts` and `qmd-manager.ts` expose
status with backend, provider, model, file/chunk counts, dirty state, vector
availability, cache state, batch state, fallback info, and source counts.

The CLI and doctor surfaces reuse the same manager path, so status, index, and
search commands exercise the runtime backend rather than a separate
implementation.
