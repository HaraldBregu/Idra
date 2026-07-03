# UI: Home Chat — grouped tool-call activity

## Goal

Replace per-tool collapsibles in assistant messages with a single grouped activity row that summarizes exploration work and expands to show each call in plain language.

## Current behavior

`AssistantMessage` renders one `<Tool>` per entry in `message.tools` (`src/renderer/src/pages/home/components/AssistantMessage.tsx`). Each row shows the raw tool name (e.g. `read`) and exposes full input/output on expand (`src/renderer/src/components/prompt-kit/tool.tsx`).

## Desired behavior

When an assistant message has tool calls, show **one** collapsible above the markdown reply:

| State | Summary label |
| --- | --- |
| Any tool still running (`input-streaming` or `input-available`) | `Exploring n files` |
| All tools finished (`output-available` or `output-error`) | `Explored n files` |

- `n` = number of tool calls in `message.tools`.
- Use singular when `n === 1`: `Exploring 1 file` / `Explored 1 file`.
- While exploring, optionally shimmer the summary label (match existing `TextShimmer` usage).

**Collapsed (default):** summary label + chevron only.

**Expanded:** a compact list of human-readable labels, one per tool call, in execution order. Examples:

- `Read filexyz.json`
- `Read another-file.ts`
- `Searched codebase for "auth middleware"`

### Label rules

Derive each list item from `AgentToolPart`:

1. Prefer `displayName` when present.
2. Otherwise format from `type` + primary input arg:
   - `read` + `path` → `Read <basename>`
   - `grep` / `search` + `pattern` or `query` → `Searched … for "<pattern>"`
   - `list_dir` + `path` → `Listed <basename>`
   - Fallback → capitalize `type` (today's behavior).

Keep labels short; show full paths, args, output, errors, and duration only inside a nested expand per item (reuse existing `Tool` input/output UI or equivalent).

### Placement & interaction

- Render the group **above** the assistant markdown, same position as today's tool block.
- Default collapsed; user expands to inspect individual calls.
- Failed calls (`output-error`) still count toward `n`; show the error in the nested detail, not in the summary count wording.

## Scope

- **In:** `AssistantMessage`, new grouped wrapper component, label helper for tool parts.
- **Out:** changing backend event shape unless `displayName` is already available and unused.
- **Out:** regrouping tools across multiple assistant messages or turns.

## Verify

1. Agent reads 3 files → summary shows `Exploring 3 files`, then `Explored 3 files`; expand lists three `Read …` rows.
2. Single file → `Explored 1 file`.
3. Mixed tools (read + grep) → count includes all calls; labels use the rules above.
4. Tool error → summary still reaches `Explored n files`; failed item shows error on nested expand.
5. Message with no tools → no activity row (unchanged).
