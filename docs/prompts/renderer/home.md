# Home Page Prompt

Create the home page as the main conversation interface.

The home page is the primary screen of the app. The user types messages to the Friday agent and receives responses in a scrollable chat thread. The page supports file attachments. Do not integrate any other external APIs (e.g., speech-to-text) — all message input and agent interaction must go through the API agent only.

## Layout

- `PageContainer` wraps the full page.
- A `ChatContainerRoot` scrollable region fills the available space above the fixed input area.
- The prompt input is absolutely positioned at the bottom of the page, overlapping the scroll area.
- A scroll-to-bottom button appears when the user has scrolled up from the latest message.

## Empty state

When there are no messages and the agent is not loading, show an empty state with a `GradientSphere`, a title, and a short description. Below the empty state, render a row of prompt suggestion chips. Clicking a suggestion pre-fills the input and submits it immediately.

## Messages

Render each message in the thread:

- `UserMessage` for `role === 'user'` messages.
- `AgentTextMessage` for `role === 'agent'` messages. Pass `isStreaming` when it is the active agent message during loading.
- Group consecutive agent messages visually by suppressing the assistant header for messages that follow another agent message.
- Collapse long content for messages that are not the last in the thread.

## Types

Follow the type placement rules in the renderer conventions.

- Types that cross the IPC boundary (e.g. message shapes passed between main and renderer) belong in the shared types directory.
- Types used by more than one renderer page (e.g. a `ChatMessage` shape shared with a history view) belong in the renderer-level types directory.
- Types scoped to this page alone — `HomeState`, `PromptAttachment`, local UI enums — stay inside the home page folder.

## API Agent

All messages must go through the API agent. Do not use any other API (speech-to-text, voice, or third-party services) for message input or processing.

- Use `useHomeAgent` to manage the full message lifecycle: submit, stream, stop, and history.
- Send user messages via the agent's submit handler. Never post messages directly to a model API or external service.
- Agent responses are streamed; update the active `AgentTextMessage` incrementally as chunks arrive.
- On submit, append the user message to the thread immediately, then wait for the agent stream to complete before finalising the agent message.
- Stopping generation mid-stream must cancel the in-flight agent request and mark the message as complete with whatever content was received.

## Input

Use `PromptInput` with:

- A leading attachment button (`Plus` icon) that opens the file picker.
- A `PromptInputTextarea` with placeholder "Ask anything".
- A `SubmitButton` that shows an `ArrowUp` icon when idle and a `Square` (stop) icon while the agent is loading. The button only renders when the input is non-empty or the agent is loading.

## Attachments

Track a local list of `PromptAttachment` objects (files only — no audio). Render them in an `AttachmentTray` above the input. Each attachment shows its name, size, and a remove button.

## Context

Wrap `PageContent` in a `Provider` that supplies the welcome message and any shared home page state.

## Hooks

- `useHomeAgent` — manages agent execution, chat state, input value, history loading, and the submit handler.

## React Design Guidelines

Follow standard React application patterns throughout:

- **Components**: keep each component focused on one responsibility. Avoid mixing data-fetching, business logic, and rendering in a single component.
- **State**: colocate state as close as possible to where it is used. Lift only when two or more siblings need to share it. Do not use global state for ephemeral UI state (input value, scroll position, loading flags).
- **Hooks**: extract all non-trivial logic into custom hooks (`use*`). Components should contain only layout and event wiring; logic lives in hooks.
- **Props**: prefer explicit, typed props over implicit context. Only reach for context when prop-drilling spans more than two levels.
- **Side effects**: put side effects (subscriptions, timers, agent subscriptions) inside `useEffect` with correct dependency arrays and cleanup functions.
- **Memoisation**: use `useMemo` and `useCallback` only when there is a measured performance problem. Do not add them preemptively.
- **Rendering**: avoid unnecessary re-renders by keeping stable references; do not create objects or arrays inline in JSX unless they are trivially cheap.
- **Conditional rendering**: use short-circuit (`&&`) for simple cases and ternaries for two-branch cases. Extract complex conditional trees into named sub-components.
- **File layout**: follow the one-file-one-export rule from the project guidelines. Each component, hook, and helper lives in its own file named with a single word.

## Testing

Write unit tests for every exported hook and component. Tests call exported hooks and components directly; they do not import internal home page files.

Cover at minimum:
- Message rendering for `user` and `agent` roles.
- Empty state display and prompt suggestion submission.
- Attachment add and remove.
- Submit button visibility (idle vs. loading vs. empty input).
- Stop-generation: cancels the agent request and finalises the message with partial content.
- `useHomeAgent`: submit dispatches the correct agent call, streamed chunks accumulate into the agent message, and history loads on mount.

Test structure:
- One `describe` block per hook or component.
- Render hooks with `renderHook` from `@testing-library/react`; components with `render`.
- Mock the API agent module at the boundary — do not mock internal helpers.
- Assert on visible output and state changes, not on implementation details.

## Logging

Use `console.error` for unexpected async failures. Do not use `console.log` or `console.debug`. See the renderer logging convention in `docs/prompts/renderer/index.md`.

Log these failure cases:

| Location | Event | Call |
|---|---|---|
| `useHomeAgent` | Agent submit throws | `console.error('[useHomeAgent] Agent submit failed:', error)` |
| `useHomeAgent` | History load fails | `console.error('[useHomeAgent] Failed to load history:', error)` |
| `useHomeAgent` | Stop/cancel throws | `console.error('[useHomeAgent] Failed to cancel agent:', error)` |
| `AttachmentTray` | File URL revoke throws | `console.warn('[AttachmentTray] Failed to revoke object URL:', error)` |

Do not log successful submissions, streamed chunks, or normal empty states.
