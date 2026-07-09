# Architecture Audit — Agent Loop (Phase 0)

Audit of the existing agent implementation in `src/main/agent/`, answering the eight questions
that drive the hardening phases (termination rails, provider adapters, subagents, lazy
loading, context engineering, checkpointing, permissions). File references are exact as of
commit `6b9bc48e1`.

---

## 1. The loop and its four phases

The loop lives in **`src/main/agent/run/run_stream.ts`** — `loop()` (line 67), wrapped by
`stream()` (line 46) which tees every event into the persisted run log. The public entry point
is `Agent.send()` in **`src/main/agent/agent.ts:70`**, which builds a `RuntimeInput`, calls
`init()` on the session, and consumes the event stream.

| Phase | Where | Notes |
|---|---|---|
| **A — gather/curate context** | `run_stream.ts:124–129`: `buildSystemPrompt(config, tools, session.context.loadedSkills)` runs at the **top of every iteration**, plus `session.messages` passed to the model turn | System prompt is rebuilt each turn (base + tool table + workspace files + skill metadata + loaded skill bodies) via `src/main/agent/system/system_build_prompt.ts`. The message history is passed through unmodified — no compaction, clearing, or curation. |
| **B — call the model** | `run_stream.ts:131–139` → `runModelTurn()` in `src/main/agent/run/run_model_turn.ts` | Streams via a singleton `LlmModel` (`run_model_turn.ts:13`); accumulates text deltas and tool-call fragments into a `ModelTurn`. `maxTokens` is hardcoded to 4096 (`run_model_turn.ts:33`). |
| **C — execute tools, append results** | `run_stream.ts:162–172` → `runToolCalls()` in `src/main/agent/run/run_tool_calls.ts`, then `addToolResults()` (`src/main/agent/session/session_add_tool_results.ts`) | Tool calls execute **sequentially**, even when the model requests several in one turn. Results are attached to `toolCall.result` in place (`run_tool_call.ts:84–87`). |
| **D — check termination, repeat** | `run_stream.ts:150–160` | Stops when `turn.toolCalls.length === 0` (success) or `isExhausted(session)` (`numTurns >= maxTurns`, default 20). `signal.aborted` is checked only at the top of the loop (`run_stream.ts:125`). |

**The context-assembly hook for all later phases** is the top of the `while (true)` body in
`run_stream.ts` (lines 124–129): system prompt construction plus the raw `session.messages`
handoff. It is already a distinct step that runs every turn — but message-history curation
(compaction, tool-result clearing) has no seam yet; messages flow to the adapter untouched.

One notable special case inside the loop: `run_stream.ts:162–171` sniffs `tool_call_end`
events for `load_skill` output and copies the skill body into `session.context.loadedSkills`
(via `rememberSkill`), which Phase A then re-injects into the system prompt. This works, but
it is exactly the kind of in-loop special case the target architecture forbids.

## 2. Conversation state

`SessionState` (**`src/main/agent/session/session_types.ts:52`**) holds
`messages: Message[]`, and that transcript is the single source of truth for what the model
sees. Two caveats:

- **Roles are `system | user | assistant` only** (`src/main/agent/types.ts:14`). There is no
  `tool` role: tool results live *nested inside* the assistant message as
  `toolCalls[].result` (`Message.toolCalls`, `types.ts:67–71`). The conversion to
  provider-specific tool-result wire messages happens in the LLM layer
  (`src/main/models/llm/llm_shared.ts`). Call-ID correlation exists (`ToolCall.id`).
- **Derived state is duplicated on the session**: `usage`, `numTurns`, `toolCalls`,
  `finalText`, `stopReason` are accumulated separately by `recordTurn` /
  `addToolResults` rather than derived from the transcript. Harmless today, but resumption
  logic (Phase 9) must reconstruct these too.

Persistence (already surprisingly good):
- `messages.json` — full-file rewrite on every mutation
  (`session_persist.ts`, called from `session_add_assistant_message.ts`,
  `session_add_tool_results.ts`, `session_init.ts`).
- `run-*.jsonl` — append-only event log of every `RuntimeEvent`
  (`session_append_run.ts`, fed by `stream()`).
- Sessions are directories under `<agentLocation>/sessions/<category>/`
  (`session_sessions_root.ts`), categories: `main | task | health | bot`.
- `init()` (`session_init.ts`) already reloads stored messages by `sessionId` — a
  primitive resume exists for conversations, though not for mid-run state (a run
  interrupted between a tool call and its result is not resumable).

Hazard: `Agent` holds **one shared `SessionState`** (`agent.ts:45,50`) reused across all
`send()` calls and agent IDs; `init()` mutates it in place. Concurrent runs for different
`agentId`s would fight over it. Subagents avoid this by creating their own state.

## 3. Tool registration and dispatch

**There is no registry.** The default tool set is a hard-coded array literal in
`run_stream.ts:81–102` (19 tools + `createImageTool` + MCP tools + `subagent`), rebuilt per
run. Dispatch is a per-batch `Map` in `run_tool_calls.ts:9`. The `Tool` shape
(`types.ts:39–44`) is uniform: `name`, `description`, `schema` (JSON Schema), `run()`.
Factories in `src/main/agent/tools/tool.ts`: `tool()` (zod, with `inputSchema.parse` —
validation failures throw and are caught in `run_tool_call.ts:64–70`, returned to the model
as an `Error: …` string, so validation-as-message already works) and `jsonTool()` (raw
schema, **no validation** — all MCP tools go through this).

**All tool schemas are sent to the model on every turn** (`req.tools` is mapped afresh in
each adapter path in `llm_model.ts`). Additionally the system prompt duplicates every tool
name + description as a markdown table (`system_add_tools_prompt.ts`) — measured at
**~575 tokens** of pure duplication for the default set.

Measured cost of the default native tool definitions (JSON `{name, description, parameters}`,
chars/4 heuristic; excludes `web_browser`, `image_create`, `subagent`, which are similar-sized):

| Tool | ~tokens | | Tool | ~tokens |
|---|---|---|---|---|
| exec | 437 | | web_search | 115 |
| process | 342 | | write | 105 |
| update_schedule | 242 | | apply_patch | 100 |
| create_schedule | 226 | | load_skill | 98 |
| edit | 132 | | read | 89 |
| web_fetch | 120 | | 7 cron/bootstrap tools | ~455 |

**Total: ~2,500 tokens** (≈2,900 with the three unmeasured tools) **+ ~575 tokens**
system-prompt table, **per request, every turn**. Below the ~20–30-tool threshold where lazy
loading pays off — Phase 6 only matters once MCP servers are attached.

No per-tool metadata exists for permission lane, pinned/deferred status, or timeouts —
gating is keyed off hardcoded tool-name lists in the policy module (see §6/§9 notes).

## 4. MCP integration

MCP is already adapted behind the uniform `Tool` interface — the loop has no MCP branches.
`loadMcpTools()` (**`src/main/agent/tools/mcp_loader.ts`**) is called once per run
(`run_stream.ts:104–110`), connects to **every enabled server eagerly**, lists tools, wraps
each in `mcpTool()` (**`tools/mcp_tool.ts`**) namespaced as `mcp__<serverId>__<toolName>`,
and closes all clients when the run ends. Servers that fail to connect are silently skipped
(no auth-failure surfaced to the model). Client plumbing is in `src/main/agent/mcp/`
(`mcp_client_connect.ts`, `mcp_client_call_tool.ts`, OAuth support in `mcp_oauth_*.ts`);
server config is user-managed in an `electron-store` (`mcp_store.ts`, default
`{ servers: {} }`).

**Token cost of tool definitions in a typical first request:** with the default (no MCP
servers configured) it is the ~3.5K tokens above. Each connected MCP server adds its full
schemas to every turn; there is no catalog/deferred mode, so cost is linear in whatever the
user connects. Connection cost is also latency: every `send()` pays connect + list-tools for
all enabled servers before the first model call.

Gaps vs Phase 7: no lazy connection, no per-server catalog entry, no gating metadata on MCP
tools (they bypass the permission gate entirely — `resolveToolPermission` only gates
`write/edit/exec/apply_patch`), auth failures invisible.

## 5. Skills

Progressive disclosure is **already implemented** in the three-tier shape:

- **Tier 1:** `addSkillPrompt` (**`system/system_add_skill_prompt.ts`**) injects one
  `- name: description` line per enabled skill into the system prompt each turn.
- **Tier 2:** the `load_skill` tool (**`tools/skill_load.ts`**) returns the SKILL.md body
  (frontmatter stripped) + skill directory. The body is then *pinned into the system prompt
  for the rest of the run* via the in-loop sniffing described in §1
  (`rememberSkill`, `context/context_remember_skill.ts`).
- **Tier 3:** bundled files are read with the ordinary `read` tool against the returned
  `skillDirectory` — the tool description instructs this.

Skills storage/validation is in `src/main/agent/skills/` (`skills_list.ts`,
`skills_load.ts`, `skills_validate.ts`, import/download/enable lifecycle). Skills never
require special loop logic *except* the `load_skill` sniff, which Phase 5 should replace
with a context-assembly concern (e.g., the tool records into session context itself).
No size warning on load (Phase 5's ≤5K check is missing). `loadedSkills` reset per run
(`run_stream.ts:112–113`).

## 6. Termination controls today

| Control | Status | Where |
|---|---|---|
| Max iterations | **Yes** — `maxTurns`, default 20, per-run override via input | `session_init.ts:33`, `session_is_exhausted.ts`; checked in `run_stream.ts:156` |
| Token/cost budget | **No** — usage is accumulated (`session_record_turn.ts`) but never enforced | — |
| Wall-clock timeout | **No** | — |
| Degenerate-cycle detection | **No** | — |
| Per-tool-call timeout | **No** — a hung tool hangs the run; abort signal not passed to tools | `run_tool_call.ts:65` |
| Structured stop reasons | **Partial** — `SessionResult.subtype` is only `success \| error_max_turns`; renderer-side `AgentRunStopReason` has `end_turn/max_tokens/max_iterations/cancelled/error` (`src/shared/agent_types.ts`), mapped in `agent.ts:164–170`. `cancelled` ends via generator return with **no** `run_finished` event; provider errors **throw** out of `stream()` (caught in `Agent.send`) rather than ending with a structured result |
| Tool errors as messages | **Yes** — throws are caught and stringified as `Error: …` tool results | `run_tool_call.ts:64–70` |
| Transient-vs-semantic retry | **Crude** — `runModelTurn` retries the whole model call once on *any* error, no backoff, no classification, and retries even after abort | `run_model_turn.ts:24–25, 79–81` |
| Parallel tool execution | **No** — sequential `for` loop | `run_tool_calls.ts:11–13` |

Also: `maxTokens` per model call is hardcoded 4096; on `max_tokens` stops with pending tool
calls the loop just continues.

## 7. Provider abstraction

**Yes, and vendor types do not leak into the loop.** `LlmModel implements LlmAdapter`
(**`src/main/models/llm/llm_model.ts`**, 664 lines) with three code paths selected by
provider id string (`streamProvider`, line ~197): `anthropic` (Anthropic SDK), `openai`
(Responses API), and everything else via OpenAI-compatible chat completions (covers
DeepSeek etc.). Neutral vocabulary is in `llm_types.ts`: `LlmEvent` (typed stream deltas),
`LlmUsage` (input/output tokens — **no cached-token field**), `LlmTranscriptEntry`.
The loop's `RuntimeModelEvent` is aliased to `LlmEvent` (`agent/types.ts:91`).

Verified by grep: `@anthropic-ai/sdk` / `openai` imports exist only in
`src/main/models/llm/{llm_model.ts,llm_shared.ts}` (plus unrelated `models/tti/tti_xai.ts`,
`models/stt/stt_openai.ts` for image/speech). **No lint rule enforces this boundary.**

Missing vs Phase 2: capability flags (parallel tool calls / thinking / caching), cached-token
usage normalization, and the three provider paths live in one class rather than separate
adapter files. Provider selection: `getProvider` / `getModelId` from
`agent/settings/settings_store.ts` — swapping providers is already a config change.

## 8. Subagent capability today

**Exists**: `subagentTool()` in **`src/main/agent/tools/subagent.ts`**, registered in
`run_stream.ts:108`. It recursively invokes the same `stream()` loop with a fresh
`createSessionState()`, its own system prompt, and `interactive: false` (any `ask`
permission becomes `deny`). Recursion depth is implicitly 1: the tool-list snapshot is
spread *before* the subagent tool is pushed, so children can't spawn.

Gaps vs Phase 3:

- **Input schema is a single `task` string** — no forced `objective` /
  `expected_output_format` / `constraints` fields.
- **No budget coupling**: child gets its own default 20 turns and unlimited tokens; nothing
  is deducted from the parent, and child usage isn't recorded anywhere (see next point).
- **Zero observability**: the child session never calls `init()`, so `sessionsPath` stays
  `''` and both `persist()` and `appendRun()` early-return — child transcripts, tool calls,
  and usage are completely unpersisted and unlinked to the parent.
- **No result cap**: the child's final text is returned verbatim regardless of size.
- **Abort not propagated**: the child gets `new AbortController().signal`
  (`subagent.ts:32`) — cancelling the parent leaves the child running.
- **No parallel fan-out**: blocked on §6's sequential tool execution.
- **No per-spawn model/tool narrowing.**

## Extras relevant to later phases

- **Permissions (Phase 9 head start):** `src/main/agent/policy/` already implements
  `allow | deny | ask` lanes with per-tool path/command allowlists, a sandbox auto-allow
  (`sandbox/sandbox_check.ts`), an `ask` flow that emits a `tool_permission_request` event
  and blocks on `waitForToolPermission` (`policy_pending.ts`), and "always allow"
  persistence. Pending approvals are an **in-memory Map** — they do not survive restart,
  and only `write/edit/exec/apply_patch` are gated (MCP/web/schedule tools are ungated).
  A usage log (`recordToolUse` → tool, decision, timestamp) exists but lacks args,
  duration, and result size.
- **Tests:** exactly one agent test exists (`tests/unit/main/agent/agent-session.test.ts`).
  Jest is configured for main-process TS (`jest.config.cjs`); the verification criteria in
  Phases 1–9 will build on that.
- **Instrumentation:** none for context size. The chars/4 measurement above was ad hoc; the
  "measure context constantly" constraint needs a per-turn breakdown (system prompt / tool
  schemas / skill content / history / tool results) emitted as a `RuntimeEvent`.
- **Conceptual guide:** `docs/RESEARCH.md` already documents the target architecture this
  audit measures against.

## Implications for the phase plan (hook map)

| Phase | Primary touch points |
|---|---|
| 1 — loop spine | `run_stream.ts` (extract Phase-A step; rails config), `run_tool_calls.ts` (parallel + timeout), `run_model_turn.ts` (retry classification), `session_types.ts` (stop reasons, budgets) |
| 2 — adapters | Split `llm_model.ts` paths into adapter files; add capability flags + cached tokens to `llm_types.ts`; ESLint `no-restricted-imports` boundary |
| 3 — subagents | `tools/subagent.ts` (schema, budgets, caps, abort, `init()` for tracing) |
| 4 — orchestration | `system/system_add_base_prompt.ts` (heuristics section) |
| 5 — skills | Remove the `load_skill` sniff from `run_stream.ts:162–171`; size warning in `skills_load.ts` |
| 6 — lazy tools | Introduce a registry (pinned/deferred metadata) replacing the array in `run_stream.ts:81–102`; drop the duplicate table in `system_add_tools_prompt.ts` |
| 7 — lazy MCP | `mcp_loader.ts` → catalog + connect-on-demand; gating metadata on `mcpTool` |
| 8 — context engineering | New curation step at the `run_stream.ts` Phase-A hook operating on `session.messages` before `runModelTurn` |
| 9 — checkpoint/permissions | Extend `session_*` persistence for mid-run resume; persist `policy_pending.ts`; widen `PERMISSION_GATED_TOOLS` to metadata-driven lanes |
