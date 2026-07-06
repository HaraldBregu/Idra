import { _electron as electron } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

const APP_DIR = import.meta.dirname;
const SHOT_DIR = '/tmp/claude/shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const app = await electron.launch({
	executablePath: path.join(APP_DIR, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),
	args: [APP_DIR],
	env: { ...process.env, NODE_ENV: 'development' },
	timeout: 60_000,
});
const page = await app.firstWindow();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(5_000);

const probe = () =>
	page.evaluate(() => {
		const tiptap = document.querySelector('.tiptap');
		return {
			expanded: document.querySelector('[data-expanded]')?.getAttribute('data-expanded'),
			hOverflow: tiptap.scrollWidth > tiptap.clientWidth + 1,
			lines: Math.round(tiptap.scrollHeight / 24),
		};
	});
const clear = async () => {
	await page.keyboard.press('Meta+a');
	await page.keyboard.press('Backspace');
	await page.waitForTimeout(200);
};
const setWindow = async (w, h) => {
	await app.evaluate(({ BrowserWindow }, size) => {
		BrowserWindow.getAllWindows()[0].setSize(size.w, size.h);
	}, { w, h });
	await page.waitForTimeout(500);
};

try {
	if (page.url().includes('#start')) {
		await page.evaluate(() => {
			[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Skip')?.click();
		});
		await page.waitForTimeout(2_000);
	}
	await page.waitForSelector('.tiptap', { timeout: 30_000 });
	await page.evaluate(() => document.querySelector('.tiptap').focus());

	const results = {};
	for (const [label, w, h] of [['narrow-900px', 900, 900], ['wide-1600px', 1600, 900]]) {
		await setWindow(w, h);

		await page.keyboard.type('a'.repeat(250), { delay: 1 });
		await page.waitForTimeout(300);
		results[`${label} typed long word`] = await probe();
		await clear();

		await page.keyboard.type('hello ' + 'b'.repeat(250), { delay: 1 });
		await page.waitForTimeout(300);
		results[`${label} text + long word`] = await probe();
		await clear();

		await page.evaluate(() => {
			document.querySelector('.tiptap').focus();
			document.execCommand('insertText', false, 'c'.repeat(300));
		});
		await page.waitForTimeout(300);
		results[`${label} pasted long word`] = await probe();
		if (label === 'wide-1600px') {
			await page.screenshot({ path: path.join(SHOT_DIR, '60-pasted-wide.png') });
		}
		await clear();
	}
	console.log(JSON.stringify(results, null, 1));
} finally {
	await app.close().catch(() => {});
}
console.log('done');
