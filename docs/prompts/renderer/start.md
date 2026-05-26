# Start Page Prompt

Create the start page as a multi-step onboarding flow.

The start page is shown the first time the user opens the app. It guides the user through connecting a provider (API key) and selecting a model for each model service before they can use the app. Once setup is complete, the user is navigated to the home page.

The start page lives at `src/renderer/src/pages/start/`.

## Steps

The flow has a fixed sequence of steps:

1. **Presentation** — Welcome screen. Explains what the app is and what comes next. No input required.
2. **Providers** — The user enters and saves an API key for at least one provider. The Continue button is disabled until at least one API key is saved.
3. **Model service steps** — One step per model service (e.g. chat, voice). The user selects a provider and a model for each service. Required services must have a model selected before the user can advance.

Navigation between steps uses Back and Continue (or "Get started" on the final step). A step progress indicator shows position in the flow.

## Layout

- Fixed header: a "Skip" button in the top-right corner that navigates directly to `/home`.
- Scrollable section: renders the current step's content.
- Fixed footer: step progress indicator on the left, Back and primary action button on the right. If there is an error, an error banner appears above the footer controls.

## State

Use a reducer (`setupReducer`) to manage all step state in a single object. Dispatch actions for step transitions, provider entry updates, API key changes, provider saves, model service provider/model selections, and error/loading state changes.

Do not put async side-effect logic inside the reducer. Side effects (saving API keys, fetching models, persisting config) belong in hooks that dispatch actions when they complete.

## Components

- `PresentationStep` — Static welcome content.
- `ProviderStep` — List of provider entries with API key inputs and save buttons.
- `ModelServiceStep` — Provider and model selectors for a single model service.
- `StepProgress` — Visual step indicator driven by current step index.
- `ProviderCard` — Card representing a single provider entry inside `ProviderStep`.
- `StepField` — Labeled form field wrapper used inside step components.

## Hooks

- `useProviderSetup` — Handles provider API key changes, saves, and link-opening side effects.
- `useModelServices` — Handles provider/model selection, model list fetching, and saving the final config.

## Error handling

Display a single error message in the footer banner when a save fails. Clear the error on the next user action. Do not show multiple concurrent errors.

## Navigation

On the final model service step, the primary button label changes to "Get started" and successful save navigates to `/home`.

## Testing

Test step transitions, provider entry validation, API key saving, model selection, config persistence, the Skip shortcut, error display, and navigation to `/home` on completion. Tests call page-level hooks and components; they do not import internal reducer or state files directly.
