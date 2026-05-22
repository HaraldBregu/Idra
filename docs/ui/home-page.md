# Home Page

Source: `src/renderer/src/pages/home/Page.tsx`

The home page is Friday's main chatbot surface. It combines a scrollable
message thread, assistant activity display, prompt composer, attachments, live
speech-to-text dictation, and a voice-mode UI state.

## Route And Layout

Route: `/home`

The shared app shell supplies the global title bar. The home page content uses
`PageContainer` and a full-height chat layout:

- `ChatContainerRoot` is the scroll container.
- `ChatContainerContent` centers the thread with `max-w-4xl`.
- The prompt composer is fixed at the bottom of the route.
- `ScrollButton` appears above the composer for returning to the latest
  message.

## Empty State

When there are no visible user or assistant messages, the page shows:

- `GradientSphere`
- `Start a conversation`
- Helper text telling the user to ask Friday to inspect code, make a change, or
  plan the next step.
- Prompt suggestions such as `Introduce yourself`, `Plan my day`, and
  `Draft a message`.

Selecting a suggestion inserts its prompt into the composer and focuses the
input.

## Chat Thread

Home restores history through `window.agent.getHistory()` in
`useHomeAgent()`. It sends prompts through `window.agent.send()` and applies
streaming response events from `window.agent.onResponse()`.

The thread renders three message types:

| Message type | Component | Behavior |
| --- | --- | --- |
| User message | `UserMessage` | Right-aligned primary bubble. Long previous messages can collapse behind `More` / `Less`. |
| Assistant message | `AgentTextMessage` | Friday header, activity panel, Markdown response bubble, tool activity, skill usage, and long-message collapse. |
| Pending interaction | `PendingMessage` | Approval and input form for unresolved agent requests, with grouped approval decisions and confirm action. |

Assistant message headers use `AssistantMessageHeader`, which shows a small
`GradientSphere` and the label `Friday`. The sphere is active while the
assistant message is streaming.

## Activity And Tools

Assistant messages can render runtime status and tool activity before or beside
the final Markdown content.

- `AgentActivityPanel` shows running, completed, cancelled, or error states.
- `AgentToolActivity` lists tool calls using the prompt-kit `Tool` component.
- `AgentSkillUsage` summarizes detected skill usage.
- Errors render as destructive inline text under the activity panel.

Pending approval events come from `window.agent.onPending()` and
`window.agent.getPending()`. User choices resolve through
`agent.resolveApproval()` and `agent.resolveInput()`.

## Prompt Composer

The bottom composer uses `PromptInput` with:

- Attachment button
- Autosizing textarea
- Dictation button
- Submit button
- Stop-generation state while the agent is loading
- Voice conversation state when the user starts voice mode without typed input

Keyboard behavior:

- `Enter` submits.
- `Shift+Enter` inserts a newline.
- `Cmd+/` or `Ctrl+/` switches back to typing and focuses the composer.

Attachments are collected in renderer state and displayed in `AttachmentTray`.
The current submit path sends only the text prompt through `agent.send(trimmed)`;
the attachment objects are not passed to the agent API yet.

## Speech To Text

Speech-to-text dictation is implemented in `useRealtimeDictation()`.

Flow:

1. The user clicks `Dictate`.
2. The hook checks microphone support and app microphone settings.
3. It requests `navigator.mediaDevices.getUserMedia()` with echo cancellation,
   noise suppression, and mono audio.
4. It starts `window.realtimeTranscription.start()` with the preferred browser
   language.
5. Audio is resampled to PCM16 and streamed with
   `window.realtimeTranscription.appendAudio()`.
6. Transcript deltas update the prompt textarea in place.
7. `Confirm dictation` finishes the session and keeps the transcript.
8. `Cancel dictation` restores the pre-dictation prompt text.

The dictation panel shows a live waveform, elapsed time, cancel, and confirm
controls. Errors appear above the composer in `RecorderErrorMessage`.

## Text To Speech And Voice Mode

Text-to-speech is configured in the start and settings model UI, but the home
page does not currently call a text-to-speech playback API for assistant
messages.

The home page does include a `conversation` voice-mode UI state:

- Starting with an empty composer switches to `voiceMode="conversation"`.
- `PromptInputVoicePanel` shows a waveform, mute/unmute, and `End`.
- Ending voice mode returns to typed chat.

When TTS runtime playback is added, Home should use the saved text-to-speech
model selection and play assistant responses from the message thread without
changing the text chat contract.
