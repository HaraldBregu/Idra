# Projects extension

A React extension that lists, creates, edits and deletes Friday projects through
[`@friday/sdk`](../../sdk). It is the reference example for driving the app from
outside its own renderer.

## Why it looks like this

Projects have no dedicated IPC channel — they are reached through the agent's project
tools. So every action here is **one agent turn restricted to a single tool**, and the
result is read off the event stream as structured data:

```js
await agent.send(
	'List all projects.',
	{ toolsAllow: ['list_projects'], lightContext: true },
	(event) => {
		if (event.type === 'tool_call_result' && event.status === 'ok') output = event.output;
	}
);
```

Nothing parses the assistant's prose. `src/lib/projects.js` is the whole seam — the rest
of the extension is ordinary React.

It also shows the two things a real integration needs:

- **Run state** — `run_state` events drive the status line, so the UI reflects what the
  agent is doing.
- **Tool permission** — `delete_project` always asks. The extension surfaces the
  `tool_permission_request` event and answers with `agent.respondToolPermission()`.

## Both SDK modes

The same code runs in either place, decided at startup by `isFriday()`:

| Where it runs           | How it reaches Friday                        |
| ----------------------- | -------------------------------------------- |
| Installed as an extension  | the preload globals, via the named exports   |
| Any browser or Node app | `connect({ token, url })` over the local API |

Outside the app the extension asks for the token from
`~/Library/Application Support/Friday/sdk-token`.

## Run it

The SDK builds from the app sources, so build it first:

```sh
npm --prefix ../../sdk run build
npm install
npm run dev      # or: npm run build, then install dist/ as an extension
```

`manifest.json` points at `dist/index.html`, so a built copy of this folder drops
straight into `~/Library/Application Support/Friday/extensions/`.

## Verify

```sh
npm run check                       # stub Friday API — no model, no app needed
node check.js <path-to-sdk-token>   # probe a running Friday instead
```

The stub replays the events a real agent run emits, so the tool-result and permission
plumbing is covered without spending a model call.
