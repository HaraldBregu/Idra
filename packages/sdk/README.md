# @friday/sdk

Typed client for app-data access in Friday.

This package exposes typed Friday APIs for in-app code and the accompanying remote client
used to call supported APIs over Friday's local HTTP bridge.

## Install

```sh
npm install @friday/sdk
```

## Usage from another app

Friday writes a bearer token to `<userData>/sdk-token` (for example:
`~/Library/Application Support/Friday/sdk-token` on macOS).
Read that token and call `connect()` to reach Friday over HTTP.

```ts
import { readFileSync } from 'node:fs';
import { connect } from '@friday/sdk';

const friday = connect({
	token: readFileSync('/Users/me/Library/Application Support/Friday/sdk-token', 'utf8').trim(),
});

await friday.ping(); // { name: 'friday', version: '1.0.0' }

const theme = await friday.app.getThemeData();
await friday.app.setTheme('dark');

const workspace = await friday.agent.getWorkspaceLocation();
const files = await friday.agent.listWorkspaceFiles();
const content = await friday.agent.readWorkspaceFile('USER.md');
```

Streaming callbacks (for `app` events) use the SSE stream opened on first use; call
`friday.close()` when finished.

## Usage inside Friday

```ts
import { agent, app, isFriday, type AppThemeData } from '@friday/sdk';

if (!isFriday()) throw new Error('Not running inside Friday');

const themeData: AppThemeData = await app.getThemeData();
await app.setTheme(themeData.themeMode === 'dark' ? 'light' : 'dark');

const workspace = await agent.getWorkspaceLocation();
const files = await agent.listWorkspaceFiles();
const content = await agent.readWorkspaceFile('USER.md');
```

## What's available

- `app`: app data + settings APIs exposed by preload (`setTheme`, `getThemeData`, `getLanguage`, etc.)
- `agent`: agent APIs exposed by preload, including `getWorkspaceLocation`, `listWorkspaceFiles`, and `readWorkspaceFile`.
- `connect()`: remote client for the app API and workspace agent APIs.
- `isFriday()`: host check for in-app mode.
- `ping()`: validate API reachability in remote mode.

## Development

Run these commands from the repository root:

```sh
npm ci
npm run sdk:build
npm run sdk:test
```

## Publishing

SDK releases use `sdk-v<version>` tags and npm trusted publishing. See the repository
[development and deployment guide](../../docs/DEVELOPMENT.md#release-the-sdk).
