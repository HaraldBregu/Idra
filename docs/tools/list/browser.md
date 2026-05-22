# browser

`browser` controls a managed browser session.

## How It Is Used

- Used when Friday must navigate, inspect, screenshot, or interact with a page.
- Helpful for checking web app behavior and visual results.
- Can support workflows where the page state matters, not just the page address.

## Boundaries

- It does not directly edit workspace files.
- Browser interactions can affect external web pages, so account-changing
  actions should be limited to explicit user requests.
- It should be used only when browser interaction is needed.
- It should avoid actions that change external accounts unless the user clearly
  asked for them.
