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

const shot = async (name) => {
	await page.screenshot({ path: path.join(SHOT_DIR, `${name}.png`) });
	console.log('screenshot:', name);
};

try {
	if (page.url().includes('#start')) {
		await page.evaluate(() => {
			[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Skip')?.click();
		});
		await page.waitForTimeout(2_000);
	}
	await page.waitForSelector('.tiptap', { timeout: 30_000 });

	// focus empty editor: check for bottom line (focus ring)
	await page.evaluate(() => document.querySelector('.tiptap').focus());
	await page.waitForTimeout(300);
	console.log('outline when focused:', await page.evaluate(() => {
		const s = getComputedStyle(document.querySelector('.tiptap'));
		return `${s.outlineStyle} ${s.outlineWidth}`;
	}));
	await shot('10-focused-empty');

	// type until it wraps several lines — verify height grows
	const heights = [];
	const wrapperHeight = () => page.evaluate(() => document.querySelector('.tiptap').parentElement.offsetHeight);
	for (let i = 0; i < 6; i++) {
		await page.keyboard.type('the quick brown fox jumps over the lazy dog again and again ', { delay: 5 });
		heights.push(await wrapperHeight());
	}
	console.log('wrapper heights while typing:', heights.join(', '));
	await shot('11-long-text');
} finally {
	await app.close().catch(() => {});
}
console.log('done');
