# Prompt: Store Tool Calls in Chat History

Use this prompt to make Friday persist complete assistant turns in chat history, including tool calls and tool results, instead of saving only user and assistant text messages.

## Goal

Chat history must preserve the full conversation state needed to restore the UI and continue future model turns correctly:

- user messages
- assistant text
- assistant tool-use blocks with tool call IDs, tool names, and parsed arguments
- tool result messages with matching tool call IDs, output content, and error state

The restored chat should show the same tool activity that happened during the original run. The next assistant request should also receive a valid provider transcript where every assistant tool call has a matching tool result.

Do not store hidden chain-of-thought or raw private reasoning. Only store user-visible assistant text, safe activity summaries if they already exist, tool call metadata, and tool results.

## Current Assumptions

- Friday uses a provider-neutral transcript model in `src/main/provider/types.ts`.
- Session persistence lives in `src/main/session/store.ts`.
- The agent loop appends transcript entries in `src/main/agent/run.ts`.
- Assistant history is exposed to the renderer through `src/main/ipc/assistant-ipc.ts`.
- The home chat reducer restores history in `src/renderer/src/pages/home/assistant-chat-state.ts`.
- Tool activity UI state is represented by `src/renderer/src/pages/home/assistant-tool-parts.ts`.

If the code has moved, first find the equivalent transcript, session store, assistant IPC, and history restoration paths.

## Success Criteria

1. A completed session file contains assistant tool-use blocks and matching tool result entries.
2. The history API returns enough structured data for the renderer to rebuild tool activity.
3. Restored history displays previous tool calls under the related assistant turn.
4. A future assistant run receives prior tool calls and results in the provider transcript, not just flattened text.
5. Tool call IDs remain stable across save, load, IPC conversion, and UI restoration.
6. Error and rejected tool results remain distinguishable from successful tool results.
7. Binary or large tool outputs are stored or summarized consistently with the existing provider model.
8. Tests cover persistence, IPC conversion, and renderer history restoration.

## Data Model Requirements

Keep a provider-neutral transcript shape that can represent tool calls as first-class history entries:

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

The important invariant is:

```txt
assistant.content contains tool_use(toolUseId=X)
then transcript later contains role=tool with toolUseId=X
```

Do not flatten tool calls into assistant text such as "Called tool X". Flattened text is acceptable only as a display fallback, not as the source of truth.

## Implementation Plan

### 1. Audit the Current History Flow

Trace one assistant run from model streaming to persisted session:

1. Provider emits a tool call.
2. Agent loop collects the tool call ID, name, and argument JSON.
3. Agent loop appends an assistant transcript entry containing both text and `tool_use` blocks.
4. Tool execution appends one `role: 'tool'` transcript entry per tool call.
5. Session store saves the transcript without dropping structured blocks.
6. Session load repairs only invalid orphan tool results, without removing valid tool call pairs.
7. IPC converts transcript entries into renderer history messages without flattening away `contentBlocks`.
8. Renderer restores assistant tool parts from `contentBlocks` and attaches tool results by matching `toolUseId`.

Fix the first point in that flow where structured tool data is lost.

### 2. Persist Tool Calls as Transcript Entries

When the assistant response includes tool calls, save the assistant turn as structured content blocks:

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

After each tool executes, append the result:

```ts
session.transcript.push({
  role: 'tool',
  toolUseId,
  isError: result.status === 'error',
  content: result.content,
});
```

Use the exact existing local types and helpers. Do not add a second history model unless the current model cannot represent this.

### 3. Preserve Structure Through IPC

The renderer history API should return assistant entries with both:

- `content`: user-facing assistant text for simple rendering
- `contentBlocks`: original assistant content blocks for restoring tool calls

Tool result entries should keep:

- `role: 'tool'`
- `toolUseId`
- text output preview
- `isError`

Avoid sending raw provider-specific response objects to the renderer. Convert them into the shared app history shape.

### 4. Restore Tool Activity in the UI

When history is loaded:

1. Create user messages from `role: 'user'`.
2. Create assistant messages from `role: 'assistant'`.
3. Convert assistant `tool_use` content blocks into visible tool parts.
4. When a `role: 'tool'` result appears, attach it to the most recent assistant tool part with the same `toolUseId`.
5. Mark restored assistant turns as completed.

If a tool result appears without a prior matching tool call, ignore it or repair it using the existing session repair policy. Do not create a fake assistant message unless product behavior requires it.

### 5. Provider Conversion Rules

Provider adapters must receive the structured transcript and translate it into their native format:

- OpenAI-style chat APIs: assistant messages include `tool_calls`; tool results use `role: 'tool'` with `tool_call_id`.
- Anthropic-style APIs: assistant messages include `tool_use` blocks; tool results are represented as matching tool result content.

Keep provider-specific formatting inside provider adapters. The session file should stay provider-neutral.

### 6. Repair and Validation

Session repair may remove invalid orphan tool results, but it must not remove valid tool call/result pairs.

Validate these cases:

- assistant text only
- assistant text plus one tool call
- assistant message with multiple tool calls
- successful tool result
- failed or rejected tool result
- interrupted run with an assistant tool call but no result

For interrupted runs, choose one explicit policy:

- keep the partial assistant entry and mark it incomplete, or
- remove incomplete tool-use blocks before saving

Document the chosen behavior in the test name or nearby documentation.

## Tests

Add or update focused tests:

1. `src/main/agent/run.ts` or assistant service tests prove a run with tools saves:
   - user entry
   - assistant entry containing `tool_use`
   - matching tool result entry
2. `src/main/session/store.ts` or repair tests prove valid tool call/result pairs survive save/load.
3. `src/main/ipc/assistant-ipc.ts` tests prove assistant `contentBlocks` and tool result metadata reach the renderer history API.
4. `src/renderer/src/pages/home/assistant-chat-state.ts` tests prove restored history shows tool calls and attaches results.
5. Provider adapter tests prove prior tool calls are sent back to the provider in the required native format.

Run the narrowest relevant test command first. Then run the broader project check if available:

```bash
yarn test
yarn typecheck
```

## Acceptance Checklist

- [ ] Session JSON stores structured tool calls, not only assistant text.
- [ ] Tool result entries are stored with matching `toolUseId`.
- [ ] Session load keeps valid tool call/result pairs.
- [ ] History IPC preserves assistant `contentBlocks`.
- [ ] Renderer restores prior tool activity under the correct assistant turn.
- [ ] Future model calls include prior tool calls and tool results.
- [ ] Tests cover success, error, and multi-tool history.
- [ ] No hidden chain-of-thought is stored or rendered.

## Notes for the Implementer

Keep the change surgical. The goal is not to redesign chat history; it is to stop losing tool-call structure when saving, loading, exposing, and restoring history.
