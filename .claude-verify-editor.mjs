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

await app.evaluate(({ BrowserWindow }) => {
	const win = BrowserWindow.getAllWindows()[0];
	win.setSize(1600, 900);
});
await page.waitForTimeout(1_000);

const probe = () =>
	page.evaluate(() => {
		const tiptap = document.querySelector('.tiptap');
		return {
			expanded: document.querySelector('[data-expanded]')?.getAttribute('data-expanded'),
			scrollHeight: tiptap?.scrollHeight,
			clientWidth: tiptap?.clientWidth,
			scrollWidth: tiptap?.scrollWidth,
		};
	});

try {
	if (page.url().includes('#start')) {
		await page.evaluate(() => {
			[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Skip')?.click();
		});
		await page.waitForTimeout(2_000);
	}
	await page.waitForSelector('.tiptap', { timeout: 30_000 });
	await page.evaluate(() => document.querySelector('.tiptap').focus());

	console.log('start:', JSON.stringify(await probe()));
	for (let i = 1; i <= 30; i++) {
		await page.keyboard.type('aaaaaaaaaa'); // 10 chars per step
		const p = await probe();
		console.log(`${i * 10} chars:`, JSON.stringify(p));
		if (p.expanded === 'true') break;
	}
	await page.screenshot({ path: path.join(SHOT_DIR, '50-wide-long-word.png') });
	console.log('screenshot: 50-wide-long-word');
} finally {
	await app.close().catch(() => {});
}
console.log('done');
