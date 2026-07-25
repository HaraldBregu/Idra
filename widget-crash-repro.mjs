import { _electron } from 'playwright-core';

const USER_DATA = process.argv[2];
const ENTRY = '/Users/haraldbregu/Library/Application Support/Friday/widgets/notes/dist/index.html';

const app = await _electron.launch({
	executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
	args: ['.', `--user-data-dir=${USER_DATA}`],
	env: { ...process.env, NODE_ENV: 'development', FRIDAY_API_PORT: '8799' },
});

await app.firstWindow();
console.log('main window up');

// Open a widget window exactly as widget_render.ts does, inside the real app process.
const result = await app.evaluate(
	async ({ BrowserWindow }, { entry, preload }) => {
		const win = new BrowserWindow({
			width: 820,
			height: 640,
			show: false,
			webPreferences: {
				preload,
				sandbox: true,
				nodeIntegration: false,
				contextIsolation: true,
				webSecurity: true,
				allowRunningInsecureContent: false,
				spellcheck: false,
			},
		});

		return await new Promise((resolve) => {
			win.webContents.on('render-process-gone', (_event, details) =>
				resolve({ crashed: true, details, windowId: win.id })
			);
			win.webContents.on('did-finish-load', async () => {
				const title = await win.webContents.executeJavaScript('document.title');
				const globals = await win.webContents.executeJavaScript(
					'Object.keys(globalThis).filter((k) => ["agent","app","widgets","win"].includes(k))'
				);
				resolve({ crashed: false, title, globals, windowId: win.id });
			});
			setTimeout(() => resolve({ timeout: true, windowId: win.id }), 15000);
			win.loadFile(entry);
		});
	},
	{ entry: ENTRY, preload: `${process.cwd()}/out/preload/index.js` }
);

console.log('RESULT', JSON.stringify(result, null, 2));
await app.close();
