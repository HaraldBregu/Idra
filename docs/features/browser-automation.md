# Browser Automation

Browser automation lets agents use managed Chromium profiles to inspect and interact with web pages under Friday's tool policy.

## Functionality

- Provides built-in managed profiles plus an attach-only placeholder for an existing user session.
- Starts and stops managed browser runtimes.
- Lists profiles and open tabs.
- Opens URLs, navigates tabs, focuses tabs, and closes tabs.
- Captures page snapshots for inspection before action.
- Captures screenshots as image tool results.
- Runs page actions such as click, fill, press, select, and scroll through the browser runtime.

## Boundaries

Browser actions are exposed through the `browser` agent tool. The broader tool runtime still applies URL policy, tool selection, approval, loop detection, timeouts, and per-turn limits before the agent can use it.

Attach-only profiles are declared but do not have an attach backend configured in the current local runtime.

## Source

- `src/main/browser/service.ts`
- `src/main/browser/runtime.ts`
- `src/main/browser/tool.ts`
- `src/main/browser/policy.ts`
- `src/main/tools/local/registry.ts`
- Existing docs: `docs/tools/index.md`

