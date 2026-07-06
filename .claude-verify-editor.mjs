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

	// heading via slash command
	await page.keyboard.type('/head', { delay: 10 });
	await page.waitForSelector('[role="listbox"]', { timeout: 5_000 });
	await page.keyboard.press('Enter'); // Heading 1
	await page.keyboard.type('My title', { delay: 5 });
	// new paragraph + bullet list via slash command
	await page.keyboard.press('Shift+Enter');
	await page.keyboard.type('/bullet', { delay: 10 });
	await page.waitForSelector('[role="listbox"]', { timeout: 5_000 });
	await page.keyboard.press('Enter');
	await page.keyboard.type('first item', { delay: 5 });
	await page.waitForTimeout(300);

	console.log('markdown value:', JSON.stringify(await markdown()));
} finally {
	await app.close().catch(() => {});
}
console.log('done');
