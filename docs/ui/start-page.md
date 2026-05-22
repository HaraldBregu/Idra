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

## Step 3: Configure Models

This step lets the user review and configure the model areas documented in
`docs/models`. It should show the full model catalog while preserving each
module's current support status.

It is about:

- Choosing the Friday Assistant large language model.
- Choosing the Voice Input speech-to-text model.
- Showing the Voice Output text-to-speech model and its runtime status.
- Showing image, video, and sound generation model areas with placeholder status
  until provider adapters are ready.
- Showing OCR endpoint/model status.
- Showing Embedding as unavailable until provider catalogs, vector index behavior,
  and runtime adapters are implemented.

The model areas covered by this step are:

| Model area | Purpose |
| --- | --- |
| Large language model | Main chat and agent reasoning model. |
| Speech to text | Model for dictation and transcription. |
| Text to speech | Model for spoken output. |
| Text to image | Model area for image generation. |
| Text to video | Model area for video generation. |
| Text to audio | Model area for sound and music generation. |
| OCR | Endpoint-backed document reading now, with future provider-backed model setup. |
| Embedding | Future semantic indexing model setup. |
