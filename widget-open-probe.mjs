import { _electron } from 'playwright-core';

const USER_DATA = process.argv[2];

const app = await _electron.launch({
	executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
	args: ['.', `--user-data-dir=${USER_DATA}`],
	env: { ...process.env, NODE_ENV: 'development', FRIDAY_API_PORT: '8799' },
});

await app.firstWindow();

const result = await app.evaluate(async ({ app: electronApp, Menu }) => {
	const log = [];
	let target;

	// Attach before clicking so nothing is missed.
	electronApp.on('browser-window-created', (_event, win) => {
		target = win;
		log.push('browser-window-created');
		win.once('ready-to-show', () => log.push('ready-to-show'));
		win.webContents.on('did-finish-load', () => log.push('did-finish-load'));
		win.webContents.on('did-fail-load', (_e, code, description) =>
			log.push(`did-fail-load ${code} ${description}`)
		);
		win.webContents.on('preload-error', (_e, path, error) =>
			log.push(`preload-error ${path} :: ${error.message}`)
		);
		win.webContents.on('render-process-gone', (_e, details) =>
			log.push(`render-process-gone ${JSON.stringify(details)}`)
		);
		win.webContents.on('console-message', (event) => {
			if (event.level === 'error' || event.level === 3) {
				log.push(`console: ${event.message ?? ''}`.slice(0, 300));
			}
		});
	});

	const items = Menu.getApplicationMenu()?.items.find((item) => /widget/i.test(item.label ?? ''))
		?.submenu?.items;
	items[0].click();

	await new Promise((resolve) => setTimeout(resolve, 6000));
	if (!target) return { log, error: 'no window created' };

	const probe = await target.webContents
		.executeJavaScript(
			`JSON.stringify({
				title: document.title,
				bodyLength: document.body.innerHTML.length,
				rootLength: document.getElementById('root')?.innerHTML.length ?? -1,
				scripts: [...document.scripts].map((s) => s.src),
			})`
		)
		.catch((cause) => `executeJavaScript failed: ${cause.message}`);

	return {
		log,
		visible: target.isVisible(),
		url: target.webContents.getURL(),
		loading: target.webContents.isLoading(),
		probe,
	};
});

console.log('RESULT', JSON.stringify(result, null, 2));
await app.close();
