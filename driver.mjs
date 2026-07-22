import { _electron } from 'playwright-core';

const app = await _electron.launch({
	executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
	args: ['./out/main/index.js'],
});

await app.firstWindow();

const menu = await app.evaluate(async ({ Menu }) => {
	const find = (items) => {
		for (const it of items || []) {
			if (it.label === 'Notes' && !it.submenu) return it;
			if (it.submenu) {
				const f = find(it.submenu.items);
				if (f) return f;
			}
		}
		return null;
	};
	const item = find(Menu.getApplicationMenu()?.items);
	if (!item) return { ok: false };
	item.click();
	return { ok: true };
});

if (!menu.ok) {
	console.log('RESULT', JSON.stringify({ error: 'Notes menu item not found' }));
	await app.close();
	process.exit(1);
}

const win = await app.waitForEvent('window', {
	predicate: (w) => w.url().includes('/widgets/notes/'),
	timeout: 15000,
});
await win.waitForLoadState('domcontentloaded');

const result = await win.evaluate(async () => {
	const methods = Object.keys(window.app || {}).filter((k) => typeof window.app[k] === 'function');
	let theme = null;
	let err = null;
	try {
		theme = await window.app.getTheme();
	} catch (e) {
		err = String(e);
	}
	return {
		hasApp: !!window.app,
		methodCount: methods.length,
		bridgeLabel: document.getElementById('bridge-label')?.textContent,
		liveThemeCall: theme,
		callError: err,
	};
});

console.log('RESULT', JSON.stringify(result, null, 2));
await app.close();
process.exit(0);
