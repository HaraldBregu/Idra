# Renderer Prompts

Prompts for creating pages in the renderer.

Each page prompt describes the purpose, structure, and behavioral expectations for a single page in the app. Use these prompts to implement new pages or to understand what an existing page must do.

## Pages

- [start.md](start.md) — Onboarding flow that runs the first time the user opens the app.
- [home.md](home.md) — Main conversation page where the user interacts with the Friday agent.
- [settings.md](settings.md) — Settings layout and its nested pages for configuring the app.

## Conventions

- Each page lives in its own folder under the pages directory.
- Each page has a single entry point component.
- Pages use `PageContainer` as their outermost layout wrapper.
- Pages must not import from other pages. Shared UI primitives live in the shared components directory.
- Page-scoped components, hooks, and context stay inside the page folder and are not exported outside it.
- Shared types or utilities that multiple pages need go in the shared directory.

## React Design Patterns

These patterns apply to every page and component in the renderer. Follow them consistently to keep the codebase scalable as the app grows.

### Separation of concerns

Three distinct layers — never mix them in a single file:

| Layer | Responsibility | Must not |
|---|---|---|
| **View** | Receive props, render UI | Call IPC, run async logic |
| **Logic** | Custom hooks — own state, effects, derived values | Render JSX |
| **Data** | IPC calls, window.store / window.app | Appear in components or providers |

### Context and the provider-hook pattern

- Create one `Provider` per logical scope (page, sub-flow). Keep providers small — they render only `children`.
- Always expose context through a typed `useSomethingContext` hook. Never import the context object directly in a component.
- Wrap the context value in `useMemo` when the object would otherwise be recreated on every render.
- No logic, no effects, and no IPC calls inside the provider body.
- Reach for context only when state must cross more than two component levels without prop-drilling.

### Compound components

Build complex UI surfaces from small, composable pieces rather than a single monolithic component.

- A parent component owns layout and structural context; child components slot into it via `children` or named slots.
- Use context within the compound boundary when children need shared state — do not thread it through props.
- Name compound parts consistently: `Shell`, `Header`, `Section`, `Panel`, `Item`, `Footer`.
- Keep each part independently renderable and testable.

### Custom hooks as the unit of reuse

- Extract logic into a hook when it is shared by two or more consumers, or too long to read inline.
- A hook owns one concern: data loading, form state, stream management, keyboard shortcuts.
- Hooks compose: a higher-level hook can call lower-level domain hooks.
- A hook returns only what callers need — no unexposed internal state in the return value.
- Every `useEffect` inside a hook must declare correct dependencies and return a cleanup function.

### Controlled components

- Prefer controlled inputs and components (`value` + `onChange`) over uncontrolled.
- Keep the draft value in local `useState`; commit it to shared state on blur or submit.
- Only use uncontrolled patterns (`defaultValue`, `ref`) for performance-critical cases with a documented reason.

### Props API design

- Accept only the fields a component actually uses. Never pass a whole state object as a prop.
- Use discriminated unions for variant behaviour: `status: 'idle' | 'loading' | 'error'`.
- Boolean props model simple toggles; use a union instead of multiple booleans for mutually exclusive states.
- Pass `useCallback`-wrapped handlers to any child wrapped in `React.memo`.

### State colocation

- State lives as close to its consumers as possible.
- Lift state only when two or more sibling components need to share it.
- Use `useReducer` for state with multiple related fields or complex transitions.
- Never put transient UI state (hover, focus, open/closed) into shared or page-level state.

### Memoisation

- Add memoisation only when a measured re-render causes a visible performance problem.
- `useMemo` for expensive derived values with stable inputs.
- `useCallback` for handlers passed to memoised children.
- `React.memo` for leaf components that render frequently with stable props.
- Do not add any of these preemptively — they add cognitive overhead and can mask real problems.

### Scalability checkpoints

Before shipping a component or hook, verify:

- Could another page reuse this? If yes, promote it to the shared components or hooks directory.
- Does this component do more than one thing? If yes, split it.
- Is this hook longer than ~80 lines? If yes, extract a sub-hook.
- Are there more than two levels of prop drilling? If yes, introduce a context.

## Types

Place types in the narrowest scope that satisfies all their consumers:

| Consumers | Where to define the type |
|---|---|
| Both **main process and renderer** | Shared types directory |
| **Multiple renderer pages** or shared renderer utilities | Renderer-level types directory |
| **Single page** only | Inside that page's folder |

Rules:
- Never duplicate a type. If the same shape is needed in two places, move it to the appropriate shared location.
- Do not import renderer-only types from the shared layer — that layer must stay process-agnostic.
- Do not import page-scoped types outside that page's folder. Promote the type if it grows beyond one page.
- Prefer named exports over default exports for types so they are easy to tree-shake and re-export selectively.

## Logging

The renderer has no custom logger library. Use `console.error` for errors and `console.warn` for recoverable warnings. Do not use `console.log` or `console.debug` in production code.

Format: `console.error('[Source] description:', error)` where `Source` is the component or hook name in PascalCase brackets.

Examples:
```ts
console.error('[ChannelsPage] Failed to load channel catalog:', error);
console.error('[useProviderSetup] Failed to save API key:', error);
console.warn('[ModelServiceStep] No models returned for provider:', providerId);
```

Log only at failure boundaries — unexpected thrown errors and unrecoverable async failures. Do not log normal control flow, empty states, or successful operations.
