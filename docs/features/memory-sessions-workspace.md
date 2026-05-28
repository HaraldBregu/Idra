# Memory, Sessions, And Workspace Context

Friday keeps agent work grounded through persisted sessions, workspace startup files, and workspace memory search.

## Sessions

- Persists agent transcripts, plans, status, provider/model metadata, labels, parent session links, subagent metadata, and compaction markers.
- Repairs tool-use/tool-result pairing when sessions are loaded.
- Sanitizes large or binary tool results before storage.
- Maintains a session index sorted by update time.
- Supports session visibility rules for self, tree, agent, or all-session memory access.

## Memory

- Searches `MEMORY.md`, files under `memory/`, extra configured memory paths, and visible session transcripts.
- Scores results with lightweight keyword matching.
- Bounds result count, line count, file size, and returned character count.
- Reads allowed memory files with workspace path guards.
- Flushes important session memory before compaction when needed.

## Workspace Context

- Owns the local workspace root.
- Guards workspace path resolution so reads and writes stay inside the root.
- Initializes a git repo for new workspaces when possible.
- Loads startup context files such as `AGENTS.md`, `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `USER.md`, `BOOTSTRAP.md`, `MEMORY.md`, and `HEARTBEAT.md`.
- Tracks bootstrap completion and removes bootstrap context after setup is done.

## Source

- `src/main/session/store.ts`
- `src/main/session/repair.ts`
- `src/main/memory-runtime.ts`
- `src/main/workspace/service.ts`
- `src/main/workspace/files.ts`
- `src/main/agent/compaction.ts`
- `src/main/agent/startup-files.ts`

