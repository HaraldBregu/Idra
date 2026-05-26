# Home Page Prompt

Create the home page as the main conversation interface.

The home page is the primary screen of the app. The user types messages to the Friday agent and receives responses in a scrollable chat thread. The page supports file attachments. Do not integrate any other external APIs (e.g., speech-to-text) — all message input and agent interaction must go through the API agent only.

The home page lives at `src/renderer/src/pages/home/`.

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

Track a local list of `PromptAttachment` objects (files and recorded audio). Render them in an `AttachmentTray` above the input. Each attachment shows its name, size, and a remove button. Audio attachments include an inline `<audio>` player.

## Voice modes

Support three voice modes: `dictation`, `recording`, and `conversation`. The active mode drives the `PromptInput` voice UI. Switching back to chat mode clears the voice mode and cancels any in-progress dictation session.

Speech-to-text uses `useRealtimeDictation`. Voice conversation mode is reserved and currently disabled in the voice actions.

## Context

Wrap `PageContent` in a `Provider` (from `./context`) that supplies the welcome message and any shared home page state.

## Hooks

- `useHomeAgent` — manages agent execution, chat state, input value, history loading, and the submit handler.
- `useRealtimeDictation` — manages dictation start/stop/cancel/finish and elapsed time.
- `useVoiceButtonMode` — determines whether the voice button triggers `record` or `dictation` mode.

## Testing

Test message rendering for user and agent roles, empty state display, prompt suggestion submission, attachment add/remove, voice mode transitions, dictation start/cancel/confirm, submit button visibility, and stop-generation behavior. Tests call exported hooks and components; they do not import internal home page files directly.
