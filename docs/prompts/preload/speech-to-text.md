# SpeechToTextApi Preload Prompt

Expose speech-to-text behavior through `window.speechToText`. This API is the renderer-safe bridge for transcription and dictation; it must not expose provider clients, adapter instances, raw sockets, service instances, API keys, or main-process internals.

## Expose

- Convert a complete audio payload to text in one request.
- Start a dictation session for streaming transcription.
- Append audio chunks to an active dictation session.
- Finish a dictation session and flush pending transcription.
- Cancel a dictation session.
- Subscribe to dictation events.

## Dependencies

- Shared speech-to-text request, response, session, and event types.
- Shared validation for batch audio payloads, dictation session ids, audio chunks, and language hints.
- Typed invoke contracts for batch transcription, dictation start, finish, and cancel.
- Typed send contracts for dictation audio chunks.
- Typed event contracts for dictation updates.
- A main-process handler that delegates to the speech-to-text service.
- Main-process provider, model, API key, and adapter resolution.

## Rules

- Use invoke-style calls for batch transcription and dictation lifecycle commands.
- Use send-style calls only for streaming audio chunks.
- Use subscription-style calls for dictation events and return unsubscribe functions.
- Validate preload inputs before sending them across IPC.
- Keep provider lookup, API key access, adapter selection, socket handling, and transcription behavior outside preload.
- Return plain transcript results for batch transcription.
- Return session metadata when dictation starts.
- Emit dictation events for started, delta, committed, completed, error, and closed states.
- Do not expose raw microphone streams, provider clients, sockets, or arbitrary IPC channels to the renderer.

## Verification

- Run the relevant typecheck when shared contracts, preload contracts, or handlers change.
- Run speech-to-text service, IPC, or preload tests when transcription or dictation behavior changes.
- Run renderer checks when renderer consumers change.
