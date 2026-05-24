# Start Page UI Improvement Plan

**File:** `src/renderer/src/pages/start/StartPage.tsx`  
**Flow:** 3-step setup wizard — `presentation → providers → models`

---

## Current State Review

The start page is a full-screen wizard with a fixed header (Skip), scrollable content, and a sticky footer (progress dots + Back/Continue). Each step is rendered by a dedicated `render*Step()` function. The structure is sound but several UX gaps reduce clarity and confidence for new users.

---

## Issues Found

### Step 1 — Presentation

| # | Issue | Impact |
|---|-------|--------|
| 1 | The welcome copy is technical and product-neutral. "Connect an AI provider, choose the models Friday should use, and review which model areas are ready now." does not sell what Friday does. | Medium |
| 2 | No capability highlights — first-time users have no idea what Friday can do before committing to setup. | High |
| 3 | The `DomeWaveAnimation` is visually nice but takes up 120px of space that could show value props. | Low |

### Step 2 — Providers

| # | Issue | Impact |
|---|-------|--------|
| 4 | All providers listed flat with no recommendation signal. A user who has no preference has no guidance on where to start. | High |
| 5 | The "capabilities" text differs per provider but is replaced by `sk-****` once connected, so the capability label only shows before connection — and the copy is inconsistent (some say "AI provider", some say specific capabilities). | Medium |
| 6 | Only one provider can be in editing mode at a time (first by default), but the list may be long enough to scroll — the editing card is not scrolled into view on open. | Low |
| 7 | The `canContinueProviders` gate requires at least one API key typed or saved, but the "Continue" button disabled state gives no explanation why it's disabled. | Medium |

### Step 3 — Models

| # | Issue | Impact |
|---|-------|--------|
| 8 | The OCR and Embedding panels are placeholder-only (no configuration available). Including them adds noise without value during initial setup. | Medium |
| 9 | "Continue" as the CTA label on the final step is weak — it implies there are more steps. Should be "Finish setup" or "Start using Friday". | Low |
| 10 | All model panels except Assistant are collapsed by default. Users may not realize voice/image/video models need to be configured and leave them empty. | Medium |
| 11 | `speechStatus` falls back to "No transcription model" for the collapsed summary — this reads as an error state rather than "optional". | Low |

### Global

| # | Issue | Impact |
|---|-------|--------|
| 12 | Footer shows the step label ("Presentation", "Provider setup") alongside the progress dots — this is redundant with the `<h1>` already on screen, and takes space from the progress indicator. | Low |
| 13 | Error display appears inside the scrollable content area, below the step content. If the user has scrolled down, errors scroll out of sight. | Medium |
| 14 | No visual distinction between required and optional model areas. Assistant is required; everything else is optional. | Medium |

---

## Proposed Improvements

### High Priority

#### 1. Add feature highlights to the presentation step

Below the description, add 3 icon+text bullet rows describing what Friday does:

```
[Bot]      AI assistant — chat with any provider model
[Mic]      Voice input — talk to Friday hands-free
[Zap]      Agents & skills — automate tasks on a schedule
```

These give users a reason to complete setup before they've seen the app. Fits within the existing `max-w-2xl` container. No new components needed — use existing icon imports.

#### 2. Add a "Recommended" badge to the first provider

In the provider catalog list, mark the first supported provider with a `Badge` variant="secondary" label "Recommended". This removes ambiguity for users who have multiple API keys and don't know where to start.

#### 3. Clarify required vs optional model areas (Models step)

- Label the Assistant panel header with a `Required` badge (use existing `Badge` component, `variant="outline"`).
- Remove the OCR and Embedding panels from the initial setup wizard entirely (or collapse them into a single "Coming soon" static row). These are not actionable and clutter the step.
- Change the default `expandedModelAreaId` to open Assistant only (already the case) but show a secondary notice: "Voice, image, and video models are optional — you can configure them later in Settings."

#### 4. Fix error visibility

Move the error `div` out of the scrollable `<section>` and into the `<footer>` as a full-width row above the buttons. This ensures errors are always visible regardless of scroll position.

### Medium Priority

#### 5. Rename the final CTA

In `getPrimaryLabel()`, for `step === 'models'` (the last step), return `'Start using Friday'` instead of `'Continue'`. This signals completion rather than another step forward.

#### 6. Add tooltip / helper text to disabled Continue button (providers step)

When `canContinueProviders` is false and the user hovers/taps Continue, show a tooltip: "Add and save at least one API key to continue." Use the existing `Tooltip` component.

#### 7. Remove step label from footer

The footer currently shows both the progress dots and the step title ("Provider setup"). The `<h1>` on the page already communicates the step name. Removing the label from the footer simplifies it and gives more room to the navigation buttons.

### Low Priority

#### 8. Replace "No transcription model" with "Optional"

In `speechStatus`, when `selectedSpeechOption` is undefined and `speechModelGroups.length === 0`, use "Not configured (optional)" rather than "No transcription model". This reduces perceived setup failure.

#### 9. Scroll active editing provider card into view

When a user clicks "Connect" on a provider card below the fold, call `card.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` via a ref so the input isn't hidden under the sticky header.

---

## Implementation Order

1. **Feature highlights on presentation step** — purely additive, no logic changes.
2. **Remove OCR + Embedding panels from models step** — simplest deletion.
3. **Rename final CTA** — one-line change in `getPrimaryLabel()`.
4. **Move error display to footer** — structural but isolated to `return` JSX.
5. **"Recommended" badge on first provider** — additive, one conditional.
6. **Required badge on Assistant panel** — additive to `renderModelAreaPanel` call.
7. **Optional notice on models step** — one extra paragraph element.
8. **Remove step label from footer** — delete one element from footer JSX.
9. **Fix "No transcription model" copy** — string change.
10. **Disabled Continue tooltip** — add Tooltip wrapper, low risk.

---

## Files to change

- `src/renderer/src/pages/start/StartPage.tsx` — all changes are contained here
- No new files needed; uses existing UI components (Badge, Tooltip, Button, etc.)
