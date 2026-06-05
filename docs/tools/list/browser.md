# browser

`browser` controls a managed browser session.

## How It Is Used

- Used when Friday must navigate, inspect, screenshot, or interact with a page.
- Helpful for checking web app behavior and visual results.
- Supports twelve actions:
  - **Lifecycle**: `start`, `stop`, `status`
  - **Session**: `profiles`, `tabs`
  - **Navigation**: `open` (new tab), `navigate` (load URL in tab), `focus`,
    `close`
  - **Inspection**: `snapshot` (accessibility tree), `screenshot` (image)
  - **Interaction**: `act` (click, fill, press, select, scroll using a ref from
    `snapshot`)
- Call `snapshot` before `act` to get the element refs needed for interaction.
- Each session is associated with a named profile (default: `"default"`); tabs
  within a session are identified by a tab id such as `t1`.

## Boundaries

- It does not directly edit workspace files.
- Browser interactions can affect external web pages, so account-changing
  actions should be limited to explicit user requests.
- It should be used only when browser interaction is needed.
- It should avoid actions that change external accounts unless the user clearly
  asked for them.
