# Memory Implementation Plan

## Goal

Implement OpenClaw-style file-backed memory in Friday, adapted to Friday's
current Electron main-process runtime. The memory system should explain and
support separate memory scopes for foreground chats, background tasks, cron
schedules, imported RAG corpora, and curated wiki knowledge.

## Reference Model

Use [OpenClaw Memory Implementation Flow](../openclaw-memory/implementation-flow.md)
as the reference, but keep Friday's existing runtime boundaries:

1. Workspace files are the durable source of truth.
2. Search is a runtime layer over those files and visible session transcripts.
3. Prompt guidance should only mention memory tools when they are available.
4. Session transcript memory must be sanitized and visibility-filtered.
5. Pre-compaction flush should append durable facts into daily memory files.
6. RAG and wiki should be separate corpora, not mixed silently with personal
   memory.

## Current Friday Baseline

Friday already has the core pieces needed for a scoped memory implementation:

- `src/main/memory.ts` seeds per-agent workspace files such as `MEMORY.md` and
  builds startup prompt context.
- `src/main/memory-runtime.ts` searches `MEMORY.md`, `memory/**/*.md`, optional
  extra paths, and visible session transcripts with bounded reads.
- `src/main/session/store.ts` persists sessions, transcript content,
  compaction markers, lineage, task labels, and memory flush metadata.
- `src/main/tasks/handlers/agent-task-handler.ts` runs background `agent.run`
  work in isolated `task:<taskId>` sessions.
- `src/main/cron` persists schedules and run history, then creates background
  tasks or runs Friday cron jobs when due.

The first implementation should extend these systems directly. Do not create a
parallel memory runtime unless the existing `WorkspaceMemorySearchManager`
cannot be evolved safely.

## Success Criteria

1. Each foreground chat can read and write its own scoped memory without
   leaking into unrelated chats.
2. Each background task can search relevant memory and persist durable task
   results under a task-specific scope.
3. Each cron schedule can search relevant memory and append run summaries under
   a schedule-specific scope.
4. RAG and wiki are modeled as separate corpora with separate docs and future
   implementation paths.
5. Search results identify the corpus and scope they came from.
6. Memory flush before compaction writes to the correct scoped daily file.
7. Existing `MEMORY.md`, `memory/*.md`, and session transcript search continue
   to work.

## Non-Goals

- No data migration for existing sessions or workspace memory files.
- No QMD sidecar in the first pass.
- No embedding/vector database requirement in the first pass.
- No renderer UI before the main-process contracts are stable.
- No automatic promotion from RAG into user memory without an explicit policy
  decision.

## Memory Scopes

Use explicit scopes so Friday can decide what to recall and where to flush.

| Scope | Durable path | Used by |
| --- | --- | --- |
| Global agent memory | `MEMORY.md` and `memory/YYYY-MM-DD.md` | All runs for the agent |
| Chat memory | `memory/chats/<chatScope>/YYYY-MM-DD.md` | A specific foreground chat/channel thread |
| Task memory | `memory/tasks/<taskId>/YYYY-MM-DD.md` | A background task session |
| Cron memory | `memory/cron/<jobId>/YYYY-MM-DD.md` | A recurring or one-shot schedule |
| RAG corpus | `memory/rag/` | Imported documents and generated chunks |
| Wiki corpus | `memory/wiki/` | Curated workspace knowledge pages |
| Sessions | session JSON files | Optional sanitized transcript recall |

Scope identifiers must be filesystem-safe. For external channel ids, thread
ids, cron ids, and task ids, use a stable normalized slug plus a short hash when
needed. Never write raw untrusted ids directly into paths.

## Search Behavior

Extend the existing memory search model from `memory | sessions` into scoped
sources:

```ts
type MemoryCorpus = 'memory' | 'sessions' | 'rag' | 'wiki' | 'all';
type MemoryScopeKind = 'global' | 'chat' | 'task' | 'cron';
```

Search defaults should be conservative:

1. Foreground chat: global memory, that chat's memory, visible sessions, and
   optionally wiki.
2. Background task: global memory, task memory, the parent chat memory when the
   task was created from a chat, visible sessions, and optionally wiki.
3. Cron run: global memory, that cron job memory, target chat memory when the
   schedule has a session target, visible sessions allowed by policy, and
   optionally wiki.
4. RAG: searched only when the caller asks for imported source material or when
   a tool/skill explicitly requests `corpus: "rag"` or `corpus: "all"`.

Every result should include:

- `corpus`
- `scopeKind`
- `scopeId`
- `path`
- `lineStart` and `lineEnd` when available
- `sessionId`, `taskId`, or `cronJobId` when applicable

## Write Behavior

Memory writes should stay append-only at first. A later cleanup pass can add
deduplication or promotion.

Foreground chat writes:

- Resolve the current chat scope from `channel` and `chatId`.
- Append durable facts, decisions, preferences, and TODOs to
  `memory/chats/<chatScope>/YYYY-MM-DD.md`.
- Keep global `MEMORY.md` for curated cross-chat facts only.

Background task writes:

- Use the task session id `task:<taskId>` as the execution session.
- Append task-specific durable output to
  `memory/tasks/<taskId>/YYYY-MM-DD.md`.
- If the task was created from a foreground chat, write only a short completion
  summary back to the parent chat memory.

Cron writes:

- Use the cron job id as the schedule memory scope.
- Append each completed run summary to
  `memory/cron/<jobId>/YYYY-MM-DD.md`.
- Store scheduled time, actual run time, run id, status, and delivery result in
  the entry.
- If a schedule targets a chat/session, write only user-visible durable results
  back to that chat memory.

RAG writes:

- Store imported source documents, manifests, and generated chunk metadata under
  `memory/rag/`.
- Do not write RAG facts into global or chat memory automatically.

Wiki writes:

- Store curated Markdown pages under `memory/wiki/`.
- Wiki edits are deliberate knowledge-base edits, not automatic transcript
  dumps.

## Phase 1: Scope Model And Path Resolution

Problem: Friday can identify sessions, tasks, cron jobs, channels, and chats,
but memory paths do not yet encode those scopes.

Implementation:

1. Add a small scope resolver near `src/main/memory-runtime.ts`.
2. Define `MemoryScope` with `kind`, `id`, `displayName`, and `relativeDir`.
3. Add path helpers for chat, task, cron, RAG, and wiki roots.
4. Reject unsafe ids and symlink escapes by reusing the existing workspace path
   guard pattern.
5. Add unit coverage for scope id normalization and path containment.

Verification:

- Unsafe scope ids cannot escape `memory/`.
- Existing `MEMORY.md` and `memory/YYYY-MM-DD.md` paths still resolve.
- Chat, task, cron, RAG, and wiki paths are deterministic.

## Phase 2: Chat Memory

Problem: `buildSystemPrompt` receives `channel` and `chatId`, but durable memory
does not yet separate one chat from another.

Implementation:

1. Resolve a chat scope from `channel` and `chatId` when an agent turn starts.
2. Search global memory plus the current chat memory by default.
3. Update pre-compaction flush so foreground chats append to the chat daily
   file instead of only the global daily file.
4. Keep root `MEMORY.md` read-only during automatic flush.
5. Include chat scope metadata in memory search results.

Verification:

- Two chats with different ids do not see each other's scoped daily memory by
  default.
- A chat can still search global memory.
- Compaction flush appends to `memory/chats/<chatScope>/YYYY-MM-DD.md`.

## Phase 3: Background Task Memory

Problem: background tasks use isolated `task:<taskId>` sessions, but they need a
durable memory scope for long-running or detached work.

Implementation:

1. Add optional task origin metadata to `TaskRunRequest.metadata`, including
   parent `sessionId`, `channel`, and `chatId` when known.
2. Resolve task memory from `taskId`.
3. When `agent.run` starts, search global memory, task memory, and parent chat
   memory if origin metadata exists.
4. Flush task session summaries to `memory/tasks/<taskId>/YYYY-MM-DD.md`.
5. On task success, optionally append a short completion summary to parent chat
   memory when the task originated from that chat.

Verification:

- A task can recall its own previous task memory during the same task scope.
- A standalone task does not write to an unrelated chat.
- Task metadata remains sanitized by the existing task manager.

## Phase 4: Cron Schedule Memory

Problem: cron schedule definitions and run history are persisted, but scheduled
work does not yet have durable memory separate from ad hoc background tasks.

Implementation:

1. Resolve cron memory from the Friday cron job id or managed schedule id.
2. Include `cronJobId`, `runId`, `scheduledFor`, and `actualTriggeredAt` in
   memory entries.
3. When a cron job creates an `agent.run` task, pass schedule identity through
   task metadata.
4. Search global memory, cron memory, and target chat memory when the schedule
   has a session target.
5. Append completed run summaries to `memory/cron/<jobId>/YYYY-MM-DD.md`.
6. Keep cron run records as operational state; keep cron memory as human-readable
   durable context.

Verification:

- Repeated runs for one cron job share that job's memory scope.
- Two cron jobs do not read each other's schedule memory by default.
- Startup recovery and skipped runs do not create duplicate memory entries.

## Phase 5: RAG Corpus

Problem: imported documents need retrieval behavior, citations, and refresh
state that should not be confused with personal memory.

Implementation:

1. Create the `memory/rag/` corpus contract described in
   [RAG](./rag/index.md).
2. Add `rag` as a memory corpus value and route it through a corpus supplement
   or dedicated manager.
3. Store source manifests with original URI, content hash, imported time, and
   refresh policy.
4. Return citations for RAG results by default.
5. Keep RAG results read-only unless the user explicitly imports, refreshes, or
   deletes a source.

Verification:

- RAG search returns source-grounded citations.
- RAG results are excluded from normal chat memory flush.
- Removing a source removes its chunks from search.

## Phase 6: Wiki Corpus

Problem: Friday needs a curated workspace knowledge base distinct from raw chat
history and imported RAG sources.

Implementation:

1. Create the `memory/wiki/` corpus contract described in
   [Wiki](./wiki/index.md).
2. Add `wiki` as a memory corpus value and search it by default for workspace
   knowledge questions.
3. Store pages as normal Markdown with frontmatter for title, tags, owner, and
   updated time.
4. Provide guarded read/write helpers so agents can edit wiki pages without
   touching unrelated memory files.
5. Add promotion policy later if chat/task/cron memories should become wiki
   pages.

Verification:

- Wiki pages are searchable separately from chat/task/cron memory.
- Wiki reads and writes cannot escape `memory/wiki/`.
- Wiki search results identify the page and line range.

## Phase 7: Indexing And Ranking

Problem: the current runtime re-reads files and scores by keyword overlap. That
is acceptable for the first scoped implementation, but it will not scale to RAG
or larger wiki corpora.

Implementation:

1. Keep keyword search for the initial scoped memory rollout.
2. Add file hash metadata so unchanged files can be skipped.
3. Add an internal index abstraction before adding SQLite or vector search.
4. Later, add SQLite FTS and optional embeddings behind the same manager
   contract.
5. Keep the durable Markdown files authoritative even when an index exists.

Verification:

- Search results remain correct after file edits.
- A missing or corrupt index can be rebuilt from workspace files.
- Search works without an embedding provider.

## Phase 8: Prompt And Tool Surface

Problem: memory guidance should reflect available tools and should not encourage
the model to overuse memory.

Implementation:

1. Build a memory prompt section only when search/read tools are enabled.
2. Tell the agent which scopes are available for the current run.
3. Prefer current user input over stale memory when they conflict.
4. Require explicit user intent before storing sensitive or private data.
5. Extend memory read/search tools with `corpus`, `scopeKind`, and `scopeId`
   filters.

Verification:

- Runs without memory tools do not include memory-tool instructions.
- Search filters reject invalid scope/corpus combinations.
- Tool output is bounded and includes enough citation metadata for follow-up
  reads.

## Open Questions

1. Should chat memory be keyed by renderer chat id only, or by
   `channel + account + chatId + threadId` for connector chats?
2. Should task memory be retained after task completion forever, or pruned after
   a configured retention window unless promoted?
3. Should cron run summaries be written for skipped/error runs, or only
   successful runs?
4. Should wiki be editable only through explicit wiki tools, or can normal file
   tools edit it if path policy allows?
