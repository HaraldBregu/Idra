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

	// heading
	await page.keyboard.type('/head', { delay: 10 });
	await page.waitForSelector('[role="listbox"]', { timeout: 5_000 });
	await page.keyboard.press('Enter');
	await page.keyboard.type('My Title', { delay: 5 });
	await page.keyboard.press('Shift+Enter');
	// bold text
	await page.keyboard.type('Some **bold** text and a list:', { delay: 5 });
	await page.keyboard.press('Shift+Enter');
	// bullet list
	await page.keyboard.type('/bullet', { delay: 10 });
	await page.waitForSelector('[role="listbox"]', { timeout: 5_000 });
	await page.keyboard.press('Enter');
	await page.keyboard.type('first item', { delay: 5 });
	await page.keyboard.press('Enter');
	await page.keyboard.type('second item', { delay: 5 });
	await page.waitForTimeout(200);

	// submit: empty item exits list, then submit
	await page.keyboard.press('Enter'); // empty trailing item
	await page.keyboard.press('Enter'); // exit list to paragraph
	await page.keyboard.press('Enter'); // submit
	await page.waitForTimeout(2500);

	await page.screenshot({ path: path.join(SHOT_DIR, '90-user-message.png') });
	console.log('screenshot: 90-user-message');
	console.log('user bubble html:', await page.evaluate(() => {
		const bubbles = [...document.querySelectorAll('[data-slot="message"] .bg-primary, .bg-primary')];
		const b = bubbles.find((el) => el.textContent?.includes('My Title'));
		return b ? b.outerHTML.slice(0, 1200) : 'NOT FOUND';
	}));
} finally {
	await app.close().catch(() => {});
}
console.log('done');
