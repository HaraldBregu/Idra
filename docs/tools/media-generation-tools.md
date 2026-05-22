# Media Generation Tools

Media generation tools let configured media modules create or transform assets.

## How They Are Used

- Used when the user asks for generated speech, images, video, sound, or similar
  media output.
- Keep provider choice and credentials in the configured module, not in the tool
  request.
- Save or return references to generated assets in a user-visible way.

## Boundaries

- They appear only when a capable provider, model, and runtime adapter are
  configured.
- Long-running media work should go through a background task when it should not
  block the current turn.
