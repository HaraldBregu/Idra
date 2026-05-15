# Prompt: Create a Complete Assistant Chatbot With Transparent Activity

Use this prompt to implement a complete chatbot experience in Friday using the current UI.

## Goal

Build a production-ready chat interface for the Friday assistant that shows the user:

- the conversation messages
- assistant streaming state
- a safe reasoning summary and reasoning state
- tool calls, arguments, results, errors, and durations
- pending approvals and required user input
- restored chat history
- cancellation, copy, reset, and empty-state behavior

Do not expose raw hidden chain-of-thought. If the product wants "chain of thought", implement a visible "Reasoning" or "Assistant activity" panel that shows concise user-facing reasoning summaries, progress states, plans, and tool activity. Treat hidden model reasoning as private and never store or render it verbatim.

## Current Assumptions

- Friday is an Electron + React + TypeScript app.
- The main chat view lives in `src/renderer/src/pages/home/HomePage.tsx`.
- The renderer talks to the assistant through `window.assistant`.
- Assistant IPC and shared types live around:
  - `src/shared/service.ts`
  - `src/main/service.ts`
  - `src/main/agent/run.ts`
  - `src/main/ipc/assistant-ipc.ts`
  - `src/preload/index.ts`
  - `src/preload/index.d.ts`
- Current streamed response events include:
  - `text_delta`
  - `tool_call_start`
  - `tool_call_args_delta`
  - `tool_call_input`
  - `tool_call_result`
- Current UI already has message, chat container, prompt input, loader, tool, and step-style primitives. Reuse the current primitives instead of creating a second design system.
- If prompt-kit components have been moved into `src/renderer/src/components/ui`, update imports consistently and do not duplicate components.

## Success Criteria

1. The chat page works as a complete assistant surface for text chat.
2. User and assistant messages render with the existing Friday visual style.
3. Assistant text streams into the active assistant message.
4. Assistant state is visible with clear states such as `thinking`, `reasoning`, `using_tools`, `waiting_for_approval`, `answering`, `completed`, `cancelled`, and `error`.
5. A visible reasoning panel shows safe summaries and progress, not raw chain-of-thought.
6. Tool calls render inline under the related assistant turn with:
   - tool name
   - lifecycle state
   - input preview
   - output preview
   - error message when failed
   - duration
   - iteration number
7. Pending approvals and human-input requests are rendered as actionable assistant messages.
8. Chat history restores messages, reasoning summaries, and completed tool activity where available.
9. Stop generation cancels the active run and leaves a coherent cancelled state.
10. Reset clears the visible session and persisted assistant history.
11. Keyboard and accessibility behavior remains usable.
12. Tests cover event reducers, UI state transitions, and the main chat flow.

## Product Rules

- Show "Reasoning" as a progress and summary UI, not as raw private reasoning.
- Prefer short status labels over verbose explanations while streaming.
- Tool details should be expandable by default only while running or when an error occurs.
- Completed tool calls should collapse by default but still show a summary line.
- Error states must be visible in the related assistant turn.
- Do not add marketing layout, hero sections, or decorative cards. This is a working desktop assistant surface.
- Keep controls compact and consistent with the current Friday UI.

## Suggested UI Shape

Use the existing home chat structure:

- `ChatContainerRoot`
- `ChatContainerContent`
- `ChatContainerScrollAnchor`
- `Message`
- `MessageContent`
- `MessageActions`
- `PromptInput`
- `PromptInputTextarea`
- `PromptInputAction`
- `ScrollButton`
- `Loader`
- `Button`
- current tooltip, step, tool, markdown, and code-block components

For each assistant turn, render in this order:

1. Assistant label
2. Reasoning/activity panel when the turn has reasoning state, reasoning summaries, or tool calls
3. Assistant message content
4. Message actions such as copy

The activity panel should support:

- state badge or compact status line
- expandable reasoning summary
- expandable tool list
- per-tool status indicator
- clear failed/cancelled styling

## Data Model

Create a renderer-level message model that can represent one assistant turn as a single object:

```ts
type AssistantRunState =
  | 'idle'
  | 'thinking'
  | 'reasoning'
  | 'using_tools'
  | 'waiting_for_approval'
  | 'answering'
  | 'completed'
  | 'cancelled'
  | 'error';

interface ReasoningPart {
  id: string;
  title: string;
  summary: string;
  state: 'pending' | 'running' | 'completed' | 'error';
  createdAtMs: number;
}

interface AssistantToolPart {
  toolCallId: string;
  type: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  iteration?: number;
  input?: unknown;
  inputText?: string;
  output?: unknown;
  outputText?: string;
  errorText?: string;
  durationMs?: number;
}

interface AssistantMessage {
  id: string;
  role: 'assistant';
  type: 'assistant';
  content: string;
  runId?: string;
  state: AssistantRunState;
  reasoning: ReasoningPart[];
  tools: AssistantToolPart[];
  errorText?: string;
}
```

Keep the exact shape aligned with the existing code, but preserve these concepts.

## Stream Event Requirements

Extend `AssistantResponseEvent` only as much as needed. Keep existing events compatible.

Add safe activity events such as:

```ts
type AssistantResponseEvent =
  | ExistingAssistantResponseEvent
  | {
      type: 'run_state';
      assistantId: string;
      runId: string;
      state: AssistantRunState;
      label?: string;
    }
  | {
      type: 'reasoning_summary';
      assistantId: string;
      runId: string;
      id: string;
      title: string;
      summary: string;
      state: 'pending' | 'running' | 'completed' | 'error';
    };
```

Rules:

- Emit `run_state: thinking` as soon as a run starts.
- Emit `run_state: reasoning` when planning or summarizing work.
- Emit `run_state: using_tools` when a tool call starts.
- Emit `run_state: waiting_for_approval` when approvals or human input are pending.
- Emit `run_state: answering` when text deltas begin.
- Emit `run_state: completed` when the run finishes normally.
- Emit `run_state: cancelled` when cancelled.
- Emit `run_state: error` on failures.
- Emit `reasoning_summary` only for safe, concise summaries generated for display.

If the selected provider exposes reasoning tokens or internal traces, do not forward them to the renderer. Convert them to safe summaries only when the provider/API explicitly supports user-visible summaries.

## Implementation Plan

### 1. Stabilize Current Chat Imports

Verify whether chat primitives live under `@/components/prompt-kit/*` or `@/components/ui/*`.

Pick one import path based on the current codebase state and update `HomePage.tsx` and helper files consistently.

Do not keep duplicate prompt-kit and UI versions of the same component.

### 2. Add a Chat Event Reducer

Move event application logic out of React effects into a focused reducer/helper near the home page, for example:

- `src/renderer/src/pages/home/assistant-chat-state.ts`
- `src/renderer/src/pages/home/assistant-tool-parts.ts`

The reducer should handle:

- user message append
- assistant run creation
- text delta append
- run state changes
- reasoning summary upsert
- tool call lifecycle updates
- pending approval message insertion
- run completion
- cancellation
- error completion
- history restore

Keep React state updates simple and predictable.

### 3. Extend Shared Assistant Events

Update shared types in `src/shared/service.ts`.

Thread the new event types through:

- `src/main/agent/run.ts`
- `src/main/service.ts`
- `src/preload/index.ts`
- `src/preload/index.d.ts`
- any IPC typing in `src/shared/ipc-channels.ts`

Keep the existing `window.assistant.onResponse` API.

### 4. Emit Run State From Main Process

In the assistant service or agent loop:

- broadcast `thinking` before provider streaming starts
- broadcast `answering` on first `text_delta`
- broadcast `using_tools` on tool start
- broadcast `completed`, `cancelled`, or `error` when the run ends

If there is no real reasoning summary source yet, emit a minimal safe summary such as:

- "Understanding the request"
- "Checking the available context"
- "Using tools to verify details"
- "Preparing the final answer"

Only emit summaries that are factual and safe for display.

### 5. Render Assistant Activity

Build or update an activity component for assistant messages.

It should render:

- current run state
- reasoning summaries
- tool calls
- pending approvals/input state

Use existing step/collapsible/tool primitives. If a primitive does not exist, add the smallest component needed under the current UI component location.

### 6. Complete Chat Controls

Add or verify:

- send message
- stop active response
- reset conversation
- copy assistant message
- scroll to latest
- use suggestion
- switch between text and voice if the existing mode supports it
- disabled/send state for empty input
- error display when assistant provider is not configured

### 7. Restore History

History restoration should preserve:

- user messages
- assistant text
- assistant tool calls
- tool results
- safe reasoning summaries when they are persisted

If reasoning summaries are not persisted yet, do not fake historical chain-of-thought. Restore messages and tool activity only.

### 8. Tests

Add focused tests for:

- event reducer appends text deltas to the active assistant message
- run state transitions are applied to the correct `runId`
- tool start, input, result, and error events update the correct tool part
- pending approvals render and resolve correctly
- cancellation leaves the active message in `cancelled`
- history maps tool-use blocks into the visible tool list
- raw reasoning text is never required or rendered

Run:

```bash
yarn typecheck
yarn test:renderer
```

If main-process event logic changed, also run:

```bash
yarn test:main
```

## Acceptance Checklist

- [ ] Chat works from the Home page using the current UI.
- [ ] No duplicate chat UI system was created.
- [ ] Assistant messages stream correctly.
- [ ] User-visible reasoning is a safe summary/state, not raw chain-of-thought.
- [ ] Tool calls show name, input, result, error, duration, and state.
- [ ] Pending approvals are actionable.
- [ ] Cancel and reset work.
- [ ] History restores cleanly.
- [ ] TypeScript shared event types are consistent across main, preload, shared, and renderer.
- [ ] Tests cover reducer/event behavior.
- [ ] `yarn typecheck` passes.

## Notes for the Implementer

Keep the first implementation surgical. Reuse the existing home chat page and assistant IPC. Do not redesign storage, providers, settings, or the voice UI unless the chatbot work directly requires it.

Prefer a small event reducer and a small activity component over scattering stream-state logic across multiple React effects.
