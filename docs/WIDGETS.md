# Widget authoring

Widgets are trusted local HTML applications loaded from Friday's application-data `widgets` directory. Each valid widget appears in the **Widgets** menu, and the menu updates automatically when widget files are added, removed, or changed.

## Create a widget

Create this directory structure:

```text
widgets/
├── settings.json
└── project/
    ├── manifest.json
    ├── index.html
    └── widget.js
```

The root `settings.json` controls all widgets:

```json
{
  "enabled": true
}
```

The widget's `manifest.json` supplies its menu title, description, metadata, and HTML entry:

```json
{
  "title": "Project",
  "description": "A compact project board for tracking work from backlog to completion.",
  "metadata": {
    "version": "1.0.0",
    "category": "project-management",
    "entry": "index.html"
  }
}
```

Use a relative `.html` entry inside the widget directory. Absolute paths, backslashes, and `..` path segments are rejected.

## Call AppApi

Friday exposes `AppApi` as `window.app` before the widget's scripts run. Do not import Electron, use `ipcRenderer`, or include Friday source files in the widget.

Use an external module script and a restrictive Content Security Policy:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src https:; object-src 'none'; base-uri 'none'; form-action 'none'"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Project</title>
  </head>
  <body>
    <p id="status">Loading…</p>
    <button id="website" type="button">Open website</button>
    <script type="module" src="./widget.js"></script>
  </body>
</html>
```

Call the API from `widget.js`:

```js
const status = document.querySelector('#status');

try {
  const theme = await window.app.getTheme();
  const language = await window.app.getLanguage();
  status.textContent = `Theme: ${theme}; language: ${language}`;
} catch (error) {
  status.textContent = error instanceof Error ? error.message : 'Unable to load app settings.';
}

document.querySelector('#website').addEventListener('click', async () => {
  await window.app.openExternalUrl('https://example.com');
});
```

All IPC-backed methods return promises, so handle rejected calls with `try`/`catch`. `getPathForFile(file)` is synchronous.

## AppApi reference

```ts
interface AppApi {
  getPathForFile(file: File): string;
  openAppDataFolder(): Promise<void>;
  openExternalUrl(url: string): Promise<void>;
  setTrayEnabled(enabled: boolean): Promise<void>;
  getTrayEnabled(): Promise<boolean>;
  setKeepAwake(enabled: boolean): Promise<void>;
  getKeepAwake(): Promise<boolean>;
  setLanguage(language: 'en' | 'it'): Promise<void>;
  getLanguage(): Promise<'en' | 'it'>;
  setTheme(theme: 'light' | 'dark' | 'system'): Promise<void>;
  getTheme(): Promise<'light' | 'dark' | 'system'>;
  getMicrophonePermission(): Promise<MicrophonePermissionSettings>;
  setMicrophoneEnabled(enabled: boolean): Promise<MicrophonePermissionSettings>;
  requestMicrophonePermission(): Promise<MicrophonePermissionSettings>;
  openSystemPreference(pane: SystemPreferencePaneId): Promise<void>;
  getCameraPermission(): Promise<CameraPermissionSettings>;
  setCameraEnabled(enabled: boolean): Promise<CameraPermissionSettings>;
  requestCameraPermission(): Promise<CameraPermissionSettings>;
  openVideo(path: string): Promise<void>;
  showImageContextMenu(path: string): Promise<void>;
  showVideoContextMenu(path: string): Promise<void>;
  showAudioContextMenu(path: string): Promise<void>;
}
```

The authoritative TypeScript contract is [`src/preload/index.d.ts`](../src/preload/index.d.ts).

## Security boundaries

- Install widgets only from sources you trust. `AppApi` can change global Friday settings, open external URLs and application-data folders, and request OS permission dialogs.
- Widget pages receive only `window.app`. Agent, provider, channel, search, media-generation, Node.js, and raw Electron APIs are not exposed.
- Popup windows, top-level navigation, and browser permission requests are denied. Open external pages with `window.app.openExternalUrl()`.
- Keep scripts local to the widget. Do not load executable JavaScript from a CDN or third-party server.
- Widgets have separate persistent browser-storage partitions. Do not store provider keys or other secrets in widget storage.
