# Prompt: Implement a Tool-Aware Chatbot

Use this prompt to implement or harden Friday's chatbot so every assistant turn can track the tools it used and the result of each tool call.

## Goal

Build a chatbot experience that preserves and displays:

- user messages
- assistant text, including streaming text
- assistant run state such as thinking, using tools, waiting for approval, answering, completed, cancelled, and error
- each tool call with a stable ID, tool name, parsed input, streamed argument text, lifecycle state, duration, and iteration
- each tool result with matching tool call ID, output preview, structured output where available, error state, and rejected or denied state
- restored chat history with previous tool activity attached to the correct assistant turn
- provider transcript continuity so future model turns receive prior tool calls and matching tool results

Do not expose, store, or render hidden chain-of-thought. If an activity UI is needed, show safe summaries and tool activity only.

## Current Implementation Map

Before changing code, audit the existing implementation. This project already has most of the required architecture:

- Provider-neutral transcript model: `src/main/provider/types.ts`
- Provider adapters for prior tool calls and tool results:
  - `src/main/provider/openai.ts`
  - `src/main/provider/anthropic.ts`
- Agent loop that streams events, executes tools, and appends transcript entries: `src/main/agent/run.ts`
- Assistant service that broadcasts renderer events and saves sessions: `src/main/service.ts`
- Persistent session store and tool pairing repair:
  - `src/main/session/store.ts`
  - `src/main/session/repair.ts`
- Renderer-facing assistant history conversion: `src/main/ipc/assistant-ipc.ts`
- Shared assistant event and history types: `src/shared/service.ts`
- Renderer chat reducer and history restoration:
  - `src/renderer/src/pages/home/assistant-chat-state.ts`
  - `src/renderer/src/pages/home/assistant-tool-parts.ts`
- Assistant run audit log: `src/main/run-logger.ts`
- Existing tests:
  - `tests/unit/main/agent/run.test.ts`
  - `tests/unit/main/session/session.test.ts`
  - `tests/unit/main/ipc/assistant-ipc.test.ts`
  - `tests/unit/main/provider/provider.test.ts`
  - `tests/unit/renderer/pages/home/assistant-chat-state.test.ts`
  - `tests/unit/renderer/pages/home/assistant-tool-parts.test.ts`

If any file has moved, find the equivalent transcript, provider adapter, agent loop, session store, IPC, shared type, reducer, and UI paths first.

## Success Criteria

1. During a new assistant run, the renderer receives tool lifecycle events for start, argument streaming, parsed input, result, error, and rejection.
2. Completed sessions persist assistant `tool_use` blocks and matching `tool` result entries with stable IDs.
3. Loading history reconstructs visible tool activity under the assistant turn that created the call.
4. Future provider requests include prior tool calls and matching tool results in the provider's native format.
5. Tool result errors and rejected tool calls remain distinguishable from successful results.
6. Multi-tool turns preserve result matching by `toolUseId`, even when results arrive in a different order.
7. Session repair removes orphan tool results and synthesizes explicit error stubs only for missing required results.
8. No hidden model reasoning is stored or rendered.
9. Focused unit tests cover agent transcript persistence, provider conversion, IPC history conversion, renderer restoration, and error/rejection states.

## Data Model Rules

Use the existing provider-neutral transcript model as the source of truth:

```ts
type TranscriptEntry =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: AssistantContentBlock[] }
  | { role: 'tool'; toolUseId: string; content: ToolResultBlock[]; isError?: boolean };

type AssistantContentBlock =
  | { type: 'text'; text: string }
  | {
      type: 'tool_use';
      toolUseId: string;
      toolName: string;
      toolArgs: unknown;
    };
```

The required invariant is:

```txt
assistant.content contains tool_use(toolUseId = X)
then the transcript contains a later role = tool entry with toolUseId = X
```

Do not flatten tool calls into assistant text as the source of truth. Flattened text is only a display fallback.

## Implementation Plan

### 1. Audit Before Editing

Trace one run through the current code:

1. Provider emits `tool_call_start`, `tool_call_args_delta`, and `tool_call_end`.
2. `src/main/agent/run.ts` converts those events into renderer stream events.
3. The agent appends an assistant transcript entry containing `tool_use` content blocks.
4. The matching tool execution appends a `role: 'tool'` transcript entry.
5. `src/main/service.ts` saves the updated session.
6. `src/main/ipc/assistant-ipc.ts` converts transcript history for the renderer.
7. `src/renderer/src/pages/home/assistant-chat-state.ts` restores chat messages.
8. `src/renderer/src/pages/home/assistant-tool-parts.ts` restores and updates tool UI parts.

Fix only the first point where tool metadata or tool results are lost.

### 2. Stream Tool Activity to the UI

Keep the shared `AssistantResponseEvent` shape compatible with the current renderer. It should support:

- `run_state`
- `reasoning_summary`
- `text_delta`
- `tool_call_start`
- `tool_call_args_delta`
- `tool_call_input`
- `tool_call_result`

For each tool call, include:

- `assistantId`
- `runId`
- `iteration`
- `toolCallId`
- `toolName`
- parsed `input`
- raw `argsText`
- structured `output` when safe
- text `outputText`
- `status: 'ok' | 'error' | 'rejected'`
- `durationMs`
- optional `errorText`

### 3. Persist Tool Calls and Results

In the agent loop, persist assistant tool calls as structured blocks:

```ts
session.transcript.push({
  role: 'assistant',
  content: [
    { type: 'text', text: assistantText },
    {
      type: 'tool_use',
      toolUseId,
      toolName,
      toolArgs,
    },
  ],
});
```

After each tool completes, append the matching result:

```ts
session.transcript.push({
  role: 'tool',
  toolUseId,
  isError: result.status !== 'ok',
  content: result.content,
});
```

Use the existing local types and helper functions. Do not introduce a second chat history model unless the current transcript model cannot represent the requirement.

### 4. Preserve Structure Through IPC

`transcriptToHistory` should expose assistant entries with:

- `content`: display text for simple rendering
- `contentBlocks`: original assistant blocks, including `tool_use`

Tool result entries should expose:

- `role: 'tool'`
- `toolUseId`
- `content` output preview
- `isError`

Do not send raw provider response objects to the renderer.

### 5. Restore Tool Activity in the Renderer

History restoration should:

1. Create user messages from `role: 'user'`.
2. Create assistant messages from `role: 'assistant'`.
3. Convert assistant `tool_use` blocks into visible tool parts.
4. Attach `role: 'tool'` results to the matching tool part by `toolUseId`.
5. Mark restored assistant turns as completed.

Live streaming should update the active assistant turn instead of creating separate messages for tool events.

### 6. Keep Provider Adapters Responsible for Native Formatting

Keep the session file provider-neutral. Provider adapters should translate the transcript at request time:

- OpenAI: assistant messages include `tool_calls`; results use `role: 'tool'` and `tool_call_id`.
- Anthropic: assistant messages include `tool_use` blocks; results are user messages with `tool_result` blocks.

Add or update adapter tests whenever the transcript shape changes.

### 7. Treat the Run Log as an Audit Summary

`src/main/run-logger.ts` can record run-level and tool-call metadata such as call ID, tool name, arguments, status, duration, and output size. The session transcript remains the source of truth for chat restoration and provider continuity.

Only store full tool outputs in the run log if product and privacy rules explicitly require it. Otherwise, keep full or structured results in the transcript and renderer-safe previews in history events.

## Verification

Run the narrowest relevant tests first:

```bash
yarn test tests/unit/main/agent/run.test.ts
yarn test tests/unit/main/session/session.test.ts
yarn test tests/unit/main/ipc/assistant-ipc.test.ts
yarn test tests/unit/main/provider/provider.test.ts
yarn test tests/unit/renderer/pages/home/assistant-chat-state.test.ts
yarn test tests/unit/renderer/pages/home/assistant-tool-parts.test.ts
```

Then run the broader checks available in the project:

```bash
yarn test
yarn typecheck
```

## Acceptance Checklist

- [ ] Tool calls stream to the renderer with stable IDs and parsed input.
- [ ] Tool results stream to the renderer with output, duration, status, and error text.
- [ ] Sessions store assistant `tool_use` blocks and matching `tool` results.
- [ ] Session repair keeps valid pairs and handles missing or orphaned results explicitly.
- [ ] History IPC preserves assistant `contentBlocks` and tool result metadata.
- [ ] Renderer history restoration attaches each result to the correct tool call.
- [ ] OpenAI and Anthropic adapters replay prior tool calls and results correctly.
- [ ] Tests cover success, error, rejection, multiple tools, and restored history.
- [ ] No raw hidden chain-of-thought is persisted or rendered.

## Notes for the Implementer

Keep the change surgical. The current codebase already has a good provider-neutral path for tool-aware chat history. Prefer completing or testing the existing flow over adding parallel state, parallel persistence, or provider-specific history structures.
