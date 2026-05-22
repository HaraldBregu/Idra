# text_to_image

`text_to_image` creates, edits, or varies images when image generation is
configured.

## How It Is Used

- Used when the user asks Friday to make an image as part of the current work.
- Can save generated image files into the workspace when requested.
- Uses the configured image module rather than carrying provider details in the
  tool request.

## Boundaries

- It should validate that generated files stay in the workspace.
- Longer image jobs should use the background task path.
