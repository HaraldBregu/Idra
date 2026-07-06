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

try {
	if (page.url().includes('#start')) {
		await page.evaluate(() => {
			[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Skip')?.click();
		});
		await page.waitForTimeout(2_000);
	}
	await page.waitForSelector('.tiptap', { timeout: 30_000 });
	await page.evaluate(() => document.querySelector('.tiptap').focus());

	await page.keyboard.type('a'.repeat(120), { delay: 2 });
	await page.waitForTimeout(400);
	console.log(JSON.stringify(await page.evaluate(() => {
		const tiptap = document.querySelector('.tiptap');
		const p = tiptap.querySelector('p');
		const s = getComputedStyle(tiptap);
		return {
			expanded: document.querySelector('[data-expanded]')?.getAttribute('data-expanded'),
			tiptapScrollHeight: tiptap.scrollHeight,
			tiptapScrollWidth: tiptap.scrollWidth,
			tiptapClientWidth: tiptap.clientWidth,
			pHeight: p?.offsetHeight,
			whiteSpace: s.whiteSpace,
			wordBreak: s.wordBreak,
			overflowWrap: s.overflowWrap,
		};
	}), null, 1));
	await page.screenshot({ path: path.join(SHOT_DIR, '40-long-word.png') });
	console.log('screenshot: 40-long-word');
} finally {
	await app.close().catch(() => {});
}
console.log('done');
