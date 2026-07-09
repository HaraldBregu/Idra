# UI Architecture Audit — Home Chat (Phase 0)

Audit of the home chat UI (`src/renderer/src/pages/home/`) and its streaming pipeline,
answering the six Phase-0 questions with concrete paths. Backend counterpart:
`docs/architecture-audit.md`. State as of commit `6b9bc48e1`.

---

## 1. How assistant messages are modeled and rendered

**Model** — `src/renderer/src/pages/home/context/state.ts`. A conversation is
`HomeChatMessage[]` (`UserMessage | AgentMessage`). An `AgentMessage` is **not an ordered
parts array**; it is:

- one `content: string` prose blob (streamed via `text_delta` concatenation),
- a **separate** `tools: AgentToolPart[]` array,
- a single `pendingPermission?` slot (one approval at a time),
- run-level fields: `state: AgentRunState`, `errorText`, `startedAtMs/completedAtMs`.

`AgentToolPart` (`context/tool-parts.ts`) is genuinely part-shaped — keyed by `toolCallId`,
states `input-streaming | input-available | output-available | output-error`, structured
`input`/`inputText`, `output`/`outputText`, `durationMs`, `errorText`, upserted idempotently
by `updateAgentToolPart()`. So roughly 40% of the Phase-1 model exists, but:

- **Sequence is lost.** Text and tools live in different fields; `AssistantMessage.tsx`
  always renders tool groups *above* the prose regardless of actual order. Worse, the
  reducer **wipes accumulated prose when a new tool call starts**
  (`reducer.ts:183` — `content: event.type === 'tool_call_start' ? '' : message.content`),
  so multi-turn runs keep only the final turn's text.
- **One `AgentMessage` per run** (`ensureAgentForRun`, `reducer.ts:72`), not per assistant
  message — another reason ordering can't be represented.
- No part types for reasoning, subagent, skill-load, plan-update, or status.

**Rendering** — `pages/home/components/AssistantMessage.tsx` composes:
`ToolActivityGroup` (skill tools, then other tools), `ToolPermissionCard`, standalone
generated images, `Markdown` prose, and a status pill. Tool cards are
`components/prompt-kit/tool.tsx` (`Tool`, Radix Collapsible) wrapped by
`ToolActivityGroup.tsx` (verb + count group header, nested per-type sections).

**Existing violations of the "no sniffing outside the parts model" principle** (inventory
to eliminate in Phase 1/2):

| Violation | Where |
|---|---|
| Skill tools detected by `tool.type.toLowerCase().includes('skill')` | `AssistantMessage.tsx:92–94` |
| `create_image` special-cased by name; output JSON re-parsed from string to find image path | `AssistantMessage.tsx:18–38` |
| Markdown scanned with regexes to decide whether the generated image is already embedded | `AssistantMessage.tsx:103–125` |
| MCP tools bucketed as verb "Browsing" via `t.startsWith('mcp__')` | `components/tool-label.ts:63` |
| History rebuild infers error from `output.startsWith('Error:')` | `src/main/agent/agent.ts:197` |

`tool-label.ts` (`toolPartLabel`, `toolVerbs`) is the embryo of the Phase-2 display-label
registry — hand-rolled per-tool-name label functions with a capitalized-name fallback.

## 2. Streaming transport and event contract

**Transport is Electron IPC, not SSE/WebSocket.** Path:
`Agent.send(…, { streamEvent })` in the main process → `eventBus.broadcast(AgentChannels.response, event)`
(`src/main/ipc/agent.ts:192`) → preload `sendAgent()` subscribes to the response channel and
filters by `runId` (`src/preload/index.ts:109–127`, exposed as `window.agent.send`) →
`useHomeAgent.sendPrompt` dispatches each event as `apply_response_event`
(`pages/home/hooks/useHomeAgent.ts:131–135`). Delivery is in-order and exactly-once in
practice (same-process IPC); events are addressed by `runId` + `toolCallId`, with **no part
index/ID for text or reasoning** and no sequence numbers — duplicate `text_delta` delivery
would duplicate prose.

**The contract** is `AgentResponseEvent` (`src/shared/agent_types.ts:134–201`). What is
*declared* vs what the backend *actually emits* (mapping in `runtimeEventToAgentEvents`,
`src/main/agent/agent.ts:245–335`):

| Concern | Declared type | Emitted today? |
|---|---|---|
| Text deltas | `text_delta` | ✅ |
| Run state | `run_state` (`thinking/using_tools/answering/…`) | ✅ |
| Model chosen | `model_selected` | ✅ |
| Tool call start + full args | `tool_call_start`, `tool_call_input` | ✅ (both fired together once args are complete; `iteration` hardcoded 0) |
| Tool args streaming | `tool_call_args_delta` | ❌ — the LLM layer produces `model_tool_call_args_delta` but the adapter drops it |
| Tool result | `tool_call_result` (status, durationMs, errorText) | ✅ |
| Approval request | `tool_permission_request` | ✅ (resolution arrives only implicitly as the eventual `tool_call_result`) |
| Stop reason | `run_finished` (`AgentRunStopReason`) | ✅ (but backend never actually produces `cancelled` — see backend audit §6) |
| Reasoning | `reasoning_summary` | ❌ declared, never emitted; reducer ignores it (`reducer.ts:131`) |
| Usage / tokens | — | ❌ nothing declared; LLM layer has usage on `model_call_end`, dropped by the adapter |
| Subagent activity | — | ❌ child runs stream inside the `subagent` tool's executor, invisible to the parent event stream |
| Skill loads | — | ❌ only visible as an ordinary `load_skill` tool call |
| MCP provenance | `serviceKind/serviceId/displayName` fields exist on tool events | ❌ hardcoded `serviceKind: 'tool'`, `displayName`/`serviceId` never set (`agent.ts:267`) |
| MCP connection status | — | ❌ |
| Plan/TODO updates | — | ❌ (no backend TODO tool exists) |
| Context-window % / compaction | — | ❌ (no backend compaction exists) |

Also declared-but-dead: `capability_resolution_start/result` and the whole
`AgentIntentResolutionSummary` family (`agent_types.ts:61–132`) — emitted by nothing,
rendered by nothing. Phase 1's protocol doc should either adopt or delete them.

**Mock harness:** none exists. There are zero renderer tests (`tests/unit/renderer/` has no
test files); the only agent test is main-side.

## 3. How tool calls / MCP / subagents are shown today

- **Tools:** collapsed-by-default activity groups (`ToolActivityGroup.tsx`) headed by a
  verb + count ("Explored 3 files"), shimmer while running (`TextShimmer`), expandable to
  per-tool `Tool` cards labeled by `toolPartLabel()`. No status icons (no check/x/spinner
  glyphs), no auto-expand of the running card, no right-aligned duration/result-size
  metadata (duration only inside the expanded body), no group header for >3 parallel
  running tools (backend executes tools serially anyway). Errors render inside the
  expanded body; the collapsed header gives no error affordance beyond the run-level pill.
- **MCP:** no badges, no server chips, no connection surface in the chat. An MCP call
  renders with its raw namespaced name (`mcp__github__search_issues` → capitalized) and the
  generic "Browsing" verb. MCP server *configuration* UI exists separately at
  `pages/settings/pages/mcp/`.
- **Subagents:** nothing. A `subagent` call renders as one opaque generic card ("Subagent")
  whose output is the child's final text; child activity is architecturally invisible (see
  §2).
- **Approvals:** `ToolPermissionCard.tsx` — functional card with Allow once / Always allow /
  Deny wired to `window.agent.respondToolPermission`. Shows only tool name + a `path` arg
  if present — no full command/diff payload, no deny feedback, no in-place transition (the
  card just disappears when the result event clears `pendingPermission`), no auto-approved
  tag, not persisted across reload.

## 4. Component and styling stack

- **React 19.2** (`package.json`), Vite via `electron-vite`, TypeScript.
- **State:** plain `useReducer` + React context (`pages/home/context/Provider.tsx`,
  `reducer.ts`). No Redux/Zustand/Jotai. Renderer↔main types funnel through
  `src/renderer/src/lib/compat.ts` re-exporting `src/shared/agent_types.ts`.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`, `tailwind.config.cjs`), shadcn-style
  component set in `components/ui/` (`components.json` present; Radix primitives:
  collapsible, dialog, popover, tooltip, etc.), `cn()` in `lib/utils`. Design tokens are
  the shadcn CSS-variable palette (`bg-muted`, `text-muted-foreground`, `border-border`,
  `bg-destructive/10`, `bg-success/10`, `bg-info/10` — see `components/status.ts`).
- **Chat primitives:** `components/prompt-kit/` (markdown, message, tool, text-shimmer) +
  `components/ui/chat-container.tsx` built on **`use-stick-to-bottom`** (auto-follow
  stream, `ScrollButton` = existing "jump to latest" pill).
- **Icons:** `lucide-react`. **Motion:** `framer-motion`/`motion` + CSS collapsible
  animations. **Markdown:** `react-markdown` + remark-gfm/breaks, `shiki` code blocks.

## 5. Persistence and historical replay

Yes — activity replays from persistence, with real gaps. Main persists transcripts per
session (`messages.json`, see backend audit §2). On mount/session-switch,
`useHomeAgent.ts:186–210` calls `window.agent.getLastMessages(sessionId)` →
`Agent.getLastMessages` caps at the **last 50 messages** (`agent.ts:42,130`) and flattens
each assistant message + nested tool results into `AgentHistoryMessage`s with
`tool_use` content blocks (`toHistoryMessages`, `agent.ts:181–243`). The renderer rebuilds
chat state in `historyToChatMessages` (`context/reducer.ts:233–272`).

Caveats that matter for Phase 1's "one code path" rule:

- **Live and historical rendering already disagree.** Live: one `AgentMessage` per run,
  prose wiped at each tool turn. Historical: one `AgentMessage` per persisted assistant
  message. The same conversation renders differently before and after reload.
- Historical tool parts lose `durationMs`, `displayName`, `serviceKind` (not in
  `AgentHistoryMessage`), and error status is partly re-inferred by string prefix.
- A pending approval does not survive reload (`pendingPermission` is render-state only,
  and the backend's pending-approval map is in-memory — backend audit §Extras).
- Run-level metadata (state, stop reason, timings, model) is not persisted per message;
  every historical message renders as flat `completed`.

## 6. Accessibility and performance baseline

- **No virtualization.** `Page.tsx:578` maps all `visibleMessages` into the DOM inside
  `ChatContainerRoot` (StickToBottom). Tolerable today only because history is capped at 50
  messages; a 200-message heavy-activity conversation would mount everything.
- Collapsed cards are cheap: Radix `CollapsibleContent` unmounts closed content. But an
  *expanded* large output renders in full (`prompt-kit/tool.tsx` `<pre>` capped at
  `max-h-60` with overflow scroll — no lazy render, no size warning).
- A11y present: `role="log"` + `aria-live="polite"` on the container
  (`chat-container.tsx`, `Page.tsx:560`), Radix keyboard-operable collapsibles/buttons,
  `aria-expanded` on toggles. Missing: reduced-motion handling for `TextShimmer`/spinners,
  live-region announcements for tool status transitions, focus management for approval
  cards.
- Auto-scroll behavior (pinned-to-bottom + jump pill) already matches Phase 3's spec via
  `use-stick-to-bottom` + `ScrollButton`.
- Liveness signals today: shimmer text + status pill only. No elapsed ticker, no token
  counter (no usage events — §2), no context meter. Elapsed time is computed only after
  completion (`status.ts:formatElapsedSeconds`).

## Implications for the phase plan (hook map)

| Phase | Primary touch points |
|---|---|
| 1 — parts model | Replace `AgentMessage{content,tools}` with ordered `parts[]` in `context/state.ts` + `reducer.ts` + `tool-parts.ts`; extend `AgentRunStreamEvent` (part addressing, usage, reasoning) in `src/shared/agent_types.ts`; emit from `src/main/agent/agent.ts` (`runtimeEventToAgentEvents`) — args-delta and usage data already exist one layer down; persist parts (extend `toHistoryMessages` or persist parts natively); build the mock harness where the reducer is already a pure function (`applyResponseEvent`) |
| 2 — tool cards | Evolve `prompt-kit/tool.tsx` + `ToolActivityGroup.tsx`; grow `tool-label.ts` into the display registry (labels + custom renderers); status icons from lucide |
| 3 — liveness | New status strip near `Page.tsx` composer; stop affordance already exists (`stopResponse`); reasoning part rendering; usage/context events from backend |
| 4 — MCP | Populate `serviceKind/serviceId/displayName` at emission (backend `mcpTool` already knows its server); badge on card header; connection panel fed by new events |
| 5 — skills | Replace the `includes('skill')` sniff with a typed `skill-load` part (backend emits it from the `load_skill` tool result it already special-cases — backend audit §1) |
| 6 — subagents | Requires backend event forwarding from child runs (backend audit §8: child streams are currently swallowed in `tools/subagent.ts`) — nested part events namespaced by child run ID |
| 7 — approvals | Extend `ToolPermissionCard` with payload rendering + in-place state transitions on the tool part (`requires-approval` as a part status, not a message-level slot); allowlist surface exists backend-side (`policy_store`) but has no settings UI |
| 8 — plan/perf | Plan-update part + backend TODO tool (none exists); virtualization of the message list; reduced-motion + live-region pass |

**Open questions for the maintainer** (blocking items flagged per instructions):
1. Phase 7.4 (pending approval on reload): the backend cannot currently resume a pending
   approval across restart — until backend Phase 9 lands, the UI can only render it as
   *expired*. Confirm that's the interim behavior.
2. Phase 8.3 checkpoints: no backend support exists today — skip until backend Phase 9?
3. The dead `capability_resolution_*` / intent-summary event types in
   `src/shared/agent_types.ts:61–132`: adopt into the new protocol or delete?
