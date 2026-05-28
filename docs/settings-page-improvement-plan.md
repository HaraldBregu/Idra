# Settings Page Improvement Plan

**Scope:** `src/renderer/src/pages/settings/`

---

## Current State

The settings system has a clean architectural backbone:
`SettingsPageShell → SettingsSection → SettingsPanel → SettingsRow/Item`

Shared primitives live in `components/index.tsx`. Navigation data is co-located in `navigation.ts`. The layout wraps all sub-routes via `Layout.tsx`.

---

## Issues Found

### 1 — `OperatorDetailsPage` is 956 lines and hard to extend

| # | Issue | Impact |
|---|-------|--------|
| 1.1 | 12+ `useState` calls, including 6 separate "current operator" states (`currentAssistantOperator`, `currentSpeechToTextOperator`, …) even though only one is ever active per route | High |
| 1.2 | Operator metadata (icon, name key, description key, provider description key, model label key, save fn) is spread across ~200 lines of nested ternary chains, repeated 8 times | High |
| 1.3 | `handleSave` repeats the same `saveXOperator → setCurrentXOperator → setSuccessMessage` pattern 5 times with no abstraction | Medium |
| 1.4 | Adding a new operator type today requires editing ~10 separate ternary locations | High |

**Fix:** Extract an `OPERATOR_CONFIG` map keyed by `OperatorType`. Each entry holds its string keys and API calls. Derive all display values and state from a single `config` lookup. Consolidate the 6 current-operator states into one `currentOperator`.

---

### 2 — Overview cards show no descriptions

| # | Issue | Impact |
|---|-------|--------|
| 2.1 | `SettingsOverviewCard` only renders `item.labelKey` — the `descriptionKey` on every nav item is ignored | Medium |
| 2.2 | Users see a flat list of section names with no context before navigating | Medium |

**Fix:** Render the description text below the title in `SettingsOverviewCard`, matching the style used in `SettingsRow`.

---

### 3 — `ProvidersPage` uses a one-off layout pattern

| # | Issue | Impact |
|---|-------|--------|
| 3.1 | Each provider card manually builds `grid-cols-[2rem_1fr_auto]` + `CardContent` instead of using `SettingsPanel` + `SettingsRow` | Low |
| 3.2 | The inline edit state (input + Save/Cancel) lives inside the same row, making it a unique layout not replicated elsewhere | Low |

**Fix:** Restructure provider cards to use `SettingsPanel` wrapping a `SettingsRow` for the display state. Keep the inline-edit expansion as-is (it's a reasonable UX pattern, just needs to sit inside a consistent shell).

---

### 4 — Footer links are non-functional `<span>` elements

| # | Issue | Impact |
|---|-------|--------|
| 4.1 | "Privacy", "Terms", "Support", "Open Source" in `Layout.tsx` are `<span>` elements with no `href` or `onClick` — misleading as link-like text | Low |

**Fix:** Remove these items from the footer or replace with real links. Keep the macOS label as a plain badge.

---

### 5 — `SettingsRow` is defined but never used

| # | Issue | Impact |
|---|-------|--------|
| 5.1 | `SettingsRow` in `components/index.tsx` wraps the `Item` pattern but all pages use `Item` directly | Low |

**Fix:** Either adopt `SettingsRow` across pages that have the matching pattern, or remove it and the dead props if it adds no value over `Item`.

---

## Implementation Order

| Priority | Item | Effort | File(s) |
|----------|------|--------|---------|
| 1 | Footer cleanup | XS | `Layout.tsx` |
| 2 | Overview descriptions | XS | `pages/overview/Page.tsx` |
| 3 | `OperatorDetailsPage` refactor | L | `pages/operators/details/Page.tsx` |
| 4 | `ProvidersPage` consistency | M | `pages/providers/Page.tsx` |
| 5 | `SettingsRow` decision | XS | `components/index.tsx` |

---

## Implementation Progress

- [ ] 1. Footer cleanup (`Layout.tsx`)
- [ ] 2. Overview descriptions (`pages/overview/Page.tsx`)
- [ ] 3. `OperatorDetailsPage` refactor
  - [ ] 3a. Extract `OPERATOR_CONFIG` lookup table
  - [ ] 3b. Consolidate 6 current-operator states → one `currentOperator`
  - [ ] 3c. Simplify `handleSave` via config
  - [ ] 3d. Simplify model-loading effect via config
- [ ] 4. `ProvidersPage` consistency
- [ ] 5. `SettingsRow` decision
