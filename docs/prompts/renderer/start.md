# Start Page Prompt

Create the start page as a multi-step onboarding flow.

The start page is shown the first time the user opens the app. It guides the user through connecting a provider (API key) and selecting a model for each model service before they can use the app. Once setup is complete, the user is navigated to the home page.

## Step sequence

The flow advances through a fixed array: `['presentation', 'providers', ...MODEL_SERVICE_STEP_IDS]`.

`MODEL_SERVICE_STEP_IDS` is derived from `MODEL_SERVICE_DEFINITIONS` (one entry per model service, in order):

| Step id | Label | Required |
|---|---|---|
| `assistant` | Assistant | yes |
| `speech-to-text` | Speech to text | no |
| `text-to-speech` | Text to speech | no |
| `image-creator` | Images | no |
| `text-to-video` | Video | no |
| `music-creator` | Music | no |

---

## Step 1 — Presentation (welcome)

**Component:** `PresentationStep`

- Renders a centered layout with a `DomeWaveAnimation` graphic, a bold `<h1>` title, and a short `<p>` description.
- Read title and description from `STEP_COPY.presentation`.
- No user input. No async work. No store calls.
- The primary button in the footer says "Get started" and advances to the `providers` step.

---

## Step 2 — Providers

**Component:** `ProviderStep`

**Goal:** the user saves at least one provider API key before continuing.

### Rendering

- Show a heading and description from `STEP_COPY.providers`.
- Render one `ProviderCard` per entry in `actionableProviderCatalog` (built from `DEFAULT_PROVIDERS`).
- Each `ProviderCard` receives the matching `ProviderSetupEntry` from state.
- Show a bottom notice ("Keys are stored locally and never shared.") with a `KeyRound` icon.

### `ProviderCard` behavior

Each card manages one provider:

- **Collapsed state** (default): shows the provider name and a "Connect" or "Edit" button.
  - If `entry.apiKeySaved` is true, show an "Edit" button that sets `entry.editing = true`.
  - If not saved, show a "Connect" button that also sets `entry.editing = true`.
- **Expanded state** (`entry.editing === true`): shows an API key text input and a Save button.
  - Input value is `entry.apiKey` (typed draft, never the real key).
  - While saving (`savingProviderId === providerId`), show a spinner inside the Save button.
  - After a successful save, `entry.apiKeySaved` becomes `true` and `entry.editing` becomes `false`.
- Provide a link to the provider's API configuration page via `onOpenLink`. Open it externally.
- Show the masked label `sk-************` when the key is saved and the card is not in edit mode.

### Store API — Providers step

On entering the `providers` step, check which providers already have a saved key:

```ts
const saved = await window.store.isProviderApiKeySaved(provider.id);
// returns boolean
```

Call this for every provider in parallel and dispatch `MERGE_PROVIDER_SAVED_STATUS` with the results.

To save an API key:

```ts
await window.store.setProviderApiKey(providerId, apiKey.trim());
```

### Continue button guard

The Continue button is disabled until `providerEntries.some(e => e.apiKeySaved || e.apiKey.trim().length > 0)` is true and no save is in progress.

On click, save any unsaved drafts in sequence, then advance to the first model service step.

---

## Step 3 — Model service steps (one per service)

**Component:** `ModelServiceStep` — reused for every model service step.

Each model service step follows the same pattern. The step is driven by the current `ModelServiceDefinition` resolved from `MODEL_SERVICE_DEFINITIONS` by matching `step === service.id`.

### Rendering

- Show the service icon (from `service.icon`) in a small rounded container.
- Show a `Badge` — "Required" (default variant) or "Optional" (secondary variant) — based on `service.required`.
- Show `service.stepTitle` as the `<h1>` and `service.stepDescription` as the description paragraph.
- Render two `StepField` selects (wrapped in `StepField` with a label):
  - **Provider select**: options are the `provider` from each `ProviderModelGroup` in `serviceState.modelGroups`. Disabled while `loadingModels` is true or `modelGroups` is empty.
  - **Model select**: options are the `models` from the group matching `serviceState.providerId`. Disabled while `loadingModels` is true or there are no models for the selected provider.
- Show a loading indicator ("Loading compatible models...") while `loadingModels` is true.
- When `serviceState.modelGroups` is empty and loading is false, show placeholder text "No providers" / "No models" in the selects.

### Store API — loading operators and providers

When entering any model service step (and whenever `connectedProviderIds` changes), load all service data in parallel:

```ts
const [storedProviders, ...configuredOperators] = await Promise.all([
  window.store.getProviders(),          // PublicProvider[] — all saved providers
  window.store.getAssistantOperator(),   // { provider, model } | null
  window.store.getSpeechToTextOperator(),
  window.store.getTextToSpeechOperator(),
  window.store.getImageCreatorOperator(),
  window.store.getTextToVideoOperator(),
  window.store.getMusicCreatorOperator(),
]);
```

Filter `storedProviders` to those whose `id` is in `supportedProviderIds` (the set built from `DEFAULT_PROVIDERS`).

For each model service, fetch models from every selectable provider:

```ts
// Per-service model fetchers (called with a PublicProvider):
window.app.getModels(provider)               // assistant — chat models
window.app.getSpeechToTextModels(provider)   // speech-to-text models
window.app.getTextToSpeechModels(provider)   // text-to-speech models
window.app.getImageCreatorModels(provider)   // image generation models
window.app.getTextToVideoModels(provider)    // video generation models
window.app.getMusicCreatorModels(provider)   // music generation models
```

Each call returns a `Model[]`. Collect results into `ProviderModelGroup[]` (skip providers that return zero models or throw). Swallow per-provider errors but surface the first one after all providers are tried.

### Pre-selecting provider and model

For each service, pick the preferred provider in this order:

1. The provider that matches the stored operator's `provider.id` (already configured).
2. The first provider whose `id` is in `connectedProviderIds` (just connected in this session).
3. The first available provider.

Pick the model:

1. The model that matches the stored operator's `model.id` if it exists in the fetched list.
2. The first model in the preferred group.

### Store API — saving a model service

When the user clicks Continue on a model service step:

```ts
// Each service exposes a saveOperator function in MODEL_SERVICE_DEFINITIONS:
await window.store.saveAssistantOperator(provider, model)
await window.store.saveSpeechToTextOperator(provider, model)
await window.store.saveTextToSpeechOperator(provider, model)
await window.store.saveImageCreatorOperator(provider, model)
await window.store.saveTextToVideoOperator(provider, model)
await window.store.saveMusicCreatorOperator(provider, model)
// All return Promise<boolean>. Throw if false.
```

Skip the save call if no provider+model is selected (only allowed for optional services). After saving, advance to the next step or navigate to `/home` if there is no next step.

---

## Layout

- Fixed header: a "Skip" button (top-right) that navigates directly to `/home`.
- Scrollable `<section>`: renders the current step component.
- Fixed footer with three zones:
  - Error banner (full width, above footer controls) — visible when `errorMessage` is non-empty.
  - Left: `StepProgress` driven by `stepIndex` out of `SETUP_STEPS.length`.
  - Right: Back button (hidden on the presentation step) + primary action button.

Primary button labels:
- `presentation` → "Get started"
- `providers` (saving) → "Saving..."
- last model service step → "Get started"
- all other model service steps → "Continue"

---

## State

Use a `setupReducer` with a single `SetupState` object:

```ts
type SetupState = {
  step: SetupStep;
  providerEntries: ProviderSetupEntry[];
  savingProviderId: string | null;   // null, a provider id, or 'all'
  serviceStates: ModelServiceStateMap;
  loadingModels: boolean;
  savingConfig: boolean;
  errorMessage: string;
};
```

Actions: `GO_TO_STEP`, `SET_ERROR`, `CLEAR_ERROR`, `UPDATE_PROVIDER_ENTRY`, `MERGE_PROVIDER_SAVED_STATUS`, `MARK_PROVIDERS_SAVED`, `SET_SAVING_PROVIDER`, `SET_LOADING_MODELS`, `LOAD_SERVICE_STATES`, `CHANGE_SERVICE_PROVIDER`, `CHANGE_SERVICE_MODEL`, `SET_SAVING_CONFIG`.

No async logic inside the reducer. Side effects belong in `useProviderSetup` and `useModelServices`.

---

## Hooks

**`useProviderSetup(state, dispatch)`**
- On step entering `providers`: call `window.store.isProviderApiKeySaved` for each provider in parallel and dispatch `MERGE_PROVIDER_SAVED_STATUS`.
- Exposes: `updateProviderEntry`, `handleProviderApiKeyChange`, `saveProviderEntry`, `handleContinueProviders`, `handleOpenProviderLink`.

**`useModelServices(state, dispatch, connectedProviderIds, navigate)`**
- On entering any model service step (or when `connectedProviderIds` changes): load providers and all operator configs in parallel, then fetch model lists per service, and dispatch `LOAD_SERVICE_STATES`.
- Exposes: `handleServiceProviderChange`, `handleServiceModelChange`, `handleSaveModelStep`.

---

## React Design Patterns

Follow the renderer React design patterns in the renderer conventions. Start-page-specific notes:

### Components

- Each step (`PresentationStep`, `ProviderStep`, `ModelServiceStep`) is a pure rendering component. Move all logic into hooks.
- Sub-components (`ProviderCard`, `StepField`) are private to this page. Never export them outside the page folder.
- Never pass the whole `state` object as a prop. Destructure and pass only the fields the component needs.
- Extract a named sub-component whenever a JSX branch becomes non-trivial to read inline.

### Context

- Wrap the start page tree in a single `SetupProvider` that exposes the `state` and `dispatch` pair from `setupReducer`.
- Step components consume context via a `useSetupContext` hook — never import the context object directly.
- No async logic or side effects inside the provider body. Those belong in `useProviderSetup` and `useModelServices`.
- Step-local UI state (e.g. which card is in edit mode) stays in `useState` inside the component — do not lift it to the context.

### Hooks

- `useProviderSetup` and `useModelServices` are the only hooks that call `window.store` or `window.app`. No component calls IPC directly.
- Each hook accepts `(state, dispatch)` from context and returns only the handlers the component tree needs.
- Model-fetch effects must cancel in-flight requests if the step changes before they resolve — return a cleanup function that sets a cancelled flag or aborts the request.

### State

- All setup state lives in `setupReducer`. Do not mirror reducer state in `useState`.
- Component-local `useState` is only for ephemeral UI: input focus, hover, which card is expanded.
- Dispatch actions with descriptive names (`GO_TO_STEP`, `SET_ERROR`). Never mutate state directly.

## Types

Follow the type placement rules in the renderer conventions.

- Types that cross the IPC boundary (e.g. `PublicProvider`, `Model`, operator records returned by `window.store`) belong in the shared types directory.
- Types consumed by multiple renderer pages belong in the renderer-level types directory.
- Types scoped to the start page alone — `SetupState`, `SetupStep`, `ProviderSetupEntry`, `ModelServiceStateMap`, reducer actions — stay inside the start page folder.

## Logging

Use `console.error` for unexpected async failures. Do not use `console.log` or `console.debug`. See the renderer logging convention in the renderer conventions.

Log these failure cases:

| Location | Event | Call |
|---|---|---|
| `useProviderSetup` | `isProviderApiKeySaved` check fails | `console.error('[useProviderSetup] Failed to check saved provider status:', error)` |
| `useProviderSetup` | `setProviderApiKey` throws | `console.error('[useProviderSetup] Failed to save API key:', error)` |
| `useProviderSetup` | Bulk continue save throws | `console.error('[useProviderSetup] Failed to save provider API keys:', error)` |
| `useModelServices` | `getProviders` or operator load throws | `console.error('[useModelServices] Failed to load service configuration:', error)` |
| `useModelServices` | Per-provider model fetch throws | `console.warn('[useModelServices] Failed to load models for provider:', providerId, error)` |
| `useModelServices` | `saveOperator` returns false or throws | `console.error('[useModelServices] Failed to save operator config:', error)` |

Per-provider model fetch failures are warnings (recoverable — other providers may succeed). All other failures are errors.

## Error handling

Display a single error message in the footer banner. Clear it on the next user action (`CLEAR_ERROR`). Surface the first error when batch model loading partially fails; do not block the step.

---

## Testing

Test step transitions, provider entry validation, `isProviderApiKeySaved` check on step entry, API key save and error path, model loading (including partial provider failure), provider/model pre-selection logic, service operator save, Skip navigation, Back button visibility, primary button labels, and navigation to `/home` on completion. Tests call exported hooks and components; they do not import internal reducer or state files directly.
