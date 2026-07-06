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
const state = () =>
	page.evaluate(() => ({
		expanded: document.querySelector('[data-expanded]')?.getAttribute('data-expanded'),
		editorHeight: document.querySelector('.tiptap')?.offsetHeight,
	}));

try {
	if (page.url().includes('#start')) {
		await page.evaluate(() => {
			[...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Skip')?.click();
		});
		await page.waitForTimeout(2_000);
	}
	await page.waitForSelector('.tiptap', { timeout: 30_000 });
	await page.evaluate(() => document.querySelector('.tiptap').focus());

	console.log('empty:', JSON.stringify(await state()));
	await page.keyboard.type('short one-liner', { delay: 5 });
	await page.waitForTimeout(300);
	console.log('one line:', JSON.stringify(await state()));
	await shot('20-one-line');

	await page.keyboard.type(' but now I keep on writing until the text wraps to a second line in the prompt', { delay: 5 });
	await page.waitForTimeout(400);
	console.log('two lines:', JSON.stringify(await state()));
	await shot('21-wrapped');
} finally {
	await app.close().catch(() => {});
}
console.log('done');
