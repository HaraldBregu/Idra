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

const markdown = () => page.evaluate(() => document.querySelector('.tiptap')?.editor?.getMarkdown?.());

try {
	if (page.url().includes('#start')) {
		await page.evaluate(() => {
			[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Skip')?.click();
		});
		await page.waitForTimeout(2_000);
	}
	await page.waitForSelector('.tiptap', { timeout: 30_000 });
	await page.evaluate(() => document.querySelector('.tiptap').focus());

	// bullet list via slash command, multiple items with Enter
	await page.keyboard.type('/bullet', { delay: 10 });
	await page.waitForSelector('[role="listbox"]', { timeout: 5_000 });
	await page.keyboard.press('Enter');
	await page.keyboard.type('first item', { delay: 5 });
	await page.keyboard.press('Enter');
	await page.keyboard.type('second item', { delay: 5 });
	await page.waitForTimeout(300);
	console.log('bullet list markdown:', JSON.stringify(await markdown()));

	await page.keyboard.press('Meta+a');
	await page.keyboard.press('Backspace');

	// ordered list via typed markdown input rule
	await page.keyboard.type('1. alpha', { delay: 5 });
	await page.keyboard.press('Enter');
	await page.keyboard.type('beta', { delay: 5 });
	await page.waitForTimeout(300);
	console.log('ordered list markdown:', JSON.stringify(await markdown()));

	// Enter on empty trailing item exits the list; Enter in paragraph still submits
	await page.keyboard.press('Enter'); // new empty item
	await page.keyboard.press('Enter'); // exits list -> paragraph
	await page.waitForTimeout(200);
	console.log('after exit markdown:', JSON.stringify(await markdown()));
	await page.keyboard.press('Enter'); // submit
	await page.waitForTimeout(1200);
	console.log('after submit, editor markdown:', JSON.stringify(await markdown()));
	console.log('message sent:', await page.evaluate(() => document.body.innerText.includes('second item')));
} finally {
	await app.close().catch(() => {});
}
console.log('done');
