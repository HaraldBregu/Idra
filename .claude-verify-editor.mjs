import { _electron as electron } from 'playwright-core';
import * as path from 'node:path';

const APP_DIR = import.meta.dirname;

const app = await electron.launch({
	executablePath: path.join(APP_DIR, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'),
	args: [APP_DIR],
	env: { ...process.env, NODE_ENV: 'development' },
	timeout: 60_000,
});
const page = await app.firstWindow();
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(5_000);

const expanded = () =>
	page.evaluate(() => document.querySelector('[data-expanded]')?.getAttribute('data-expanded'));

try {
	if (page.url().includes('#start')) {
		await page.evaluate(() => {
			[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Skip')?.click();
		});
		await page.waitForTimeout(2_000);
	}
	await page.waitForSelector('.tiptap', { timeout: 30_000 });
	await page.evaluate(() => document.querySelector('.tiptap').focus());

	// type one long unbroken word char by char, record every state transition
	const states = [];
	for (let i = 1; i <= 100; i++) {
		await page.keyboard.type('a');
		const e = await expanded();
		if (states.length === 0 || states[states.length - 1].e !== e) states.push({ chars: i, e });
	}
	console.log('transitions:', JSON.stringify(states));

	// clearing should collapse again
	await page.keyboard.press('Meta+a');
	await page.keyboard.press('Backspace');
	await page.waitForTimeout(300);
	console.log('after clear:', await expanded());
} finally {
	await app.close().catch(() => {});
}
console.log('done');
