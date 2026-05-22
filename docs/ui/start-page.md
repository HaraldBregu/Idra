# Start Page

The start page is the first-run setup flow users see before entering Home. It
guides them through three steps: presentation, provider setup, and model
configuration.

## Step 1: Presentation

This step welcomes the user to Friday and explains the setup goal.

It is about:

- Introducing Friday.
- Explaining that setup connects an AI provider and chooses models.
- Letting the user start setup.
- Letting the user skip setup and go to Home.

## Step 2: Provider Setup

This step lets the user connect at least one AI provider.

It is about:

- Showing available providers.
- Letting the user add or edit a provider API key.
- Showing whether a provider key is already saved.
- Keeping provider credentials in local app data.
- Continuing only after at least one provider is ready.

## /cl

This step lets the user choose which models Friday should use. It follows the
model areas documented in `docs/models`, focused on the model choices that are
part of first-run setup.

It is about:

- Choosing the Friday Assistant chat model.
- Choosing the Voice Input speech-to-text model.
- Showing the Voice Output text-to-speech model.
- Showing Text To Image as a disabled placeholder until image providers are
  configurable.

The model areas covered by this step are:

| Model area | Purpose |
| --- | --- |
| Large language model | Main chat and agent reasoning model. |
| Speech to text | Model for dictation and transcription. |
| Text to speech | Model for spoken output. |
| Text to image | Future image generation model setup. |
