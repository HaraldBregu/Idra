import { _electron } from 'playwright-core';

const USER_DATA = process.argv[2];

const app = await _electron.launch({
	executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
	args: ['.', `--user-data-dir=${USER_DATA}`],
	env: { ...process.env, NODE_ENV: 'development', FRIDAY_API_PORT: '8799' },
});

await app.firstWindow();

const result = await app.evaluate(async ({ BrowserWindow, Menu }) => {
	const report = { menuLabels: [], widgetItems: [], opened: null, error: null };

	const menu = Menu.getApplicationMenu();
	if (!menu) return { ...report, error: 'No application menu set.' };
	report.menuLabels = menu.items.map((item) => item.label);

	// The Widgets top-level menu holds one item per installed widget.
	const widgetItems = menu.items.find((item) => /widget/i.test(item.label ?? ''))?.submenu?.items;
	if (!widgetItems) {
		const labels = menu.items.flatMap((item) =>
			(item.submenu?.items ?? []).map((sub) => `${item.label} > ${sub.label}`)
		);
		return { ...report, error: 'No widgets submenu found.', menuLabels: labels };
	}

	report.widgetItems = widgetItems.map((item) => item.label);

	const before = new Set(BrowserWindow.getAllWindows().map((win) => win.id));
	try {
		widgetItems[0].click();
	} catch (cause) {
		report.error = `click threw: ${cause.message}`;
		return report;
	}

	const win = await new Promise((resolve) => {
		const started = Date.now();
		const tick = setInterval(() => {
			const fresh = BrowserWindow.getAllWindows().find((candidate) => !before.has(candidate.id));
			if (fresh) {
				clearInterval(tick);
				resolve(fresh);
			} else if (Date.now() - started > 8000) {
				clearInterval(tick);
				resolve(null);
			}
		}, 100);
	});

	if (!win) {
		report.error = 'Clicking the widget item opened no window.';
		return report;
	}

	report.opened = await new Promise((resolve) => {
		const done = (value) => resolve(value);
		win.webContents.on('render-process-gone', (_e, details) => done({ crashed: details }));
		win.webContents.on('did-fail-load', (_e, code, description, url) =>
			done({ failed: { code, description, url } })
		);
		win.webContents.on('did-finish-load', async () => {
			done({
				url: win.webContents.getURL(),
				title: await win.webContents.executeJavaScript('document.title'),
				bodyLength: await win.webContents.executeJavaScript('document.body.innerHTML.length'),
				consoleErrors: 'see stderr',
			});
		});
		setTimeout(() => done({ timeout: true, url: win.webContents.getURL() }), 10000);
	});

	return report;
});

console.log('RESULT', JSON.stringify(result, null, 2));
await app.close();
