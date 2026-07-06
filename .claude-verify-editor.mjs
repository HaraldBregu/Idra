import { _electron as electron } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';

const APP_DIR = import.meta.dirname;
const SHOT_DIR = process.env.SHOT_DIR || '/tmp/claude/shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const electronBin = path.join(APP_DIR, 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron');

const app = await electron.launch({
	executablePath: electronBin,
	args: [APP_DIR],
	env: { ...process.env, NODE_ENV: 'development' },
	timeout: 60_000,
});

const page = await app.firstWindow();
await page.waitForLoadState('domcontentloaded');

const shot = async (name) => {
	const f = path.join(SHOT_DIR, `${name}.png`);
	await page.screenshot({ path: f });
	console.log('screenshot:', f);
};

try {
	await page.waitForTimeout(6_000);
	console.log('windows:', app.windows().map((w) => w.url()));
	console.log('url:', page.url());
	await shot('00-initial');
	console.log('body text head:', (await page.evaluate(() => document.body.innerText)).slice(0, 400));
	await page.waitForSelector('.tiptap', { timeout: 30_000 });
	console.log('editor found');
	await shot('01-landing');

	await page.evaluate(() => document.querySelector('.tiptap').focus());
	await page.keyboard.type('Hello from tiptap', { delay: 20 });
	await page.waitForTimeout(300);
	const text1 = await page.evaluate(() => document.querySelector('.tiptap').innerText);
	console.log('typed text:', JSON.stringify(text1));
	await shot('02-typed');

	// slash menu
	await page.keyboard.press('Shift+Enter');
	await page.keyboard.type('/', { delay: 20 });
	const menu = await page.waitForSelector('[role="listbox"]', { timeout: 5_000 });
	console.log('slash menu open:', Boolean(menu));
	console.log('menu items:', await page.evaluate(() =>
		[...document.querySelectorAll('[role="listbox"] [role="option"]')].map((el) => el.textContent)
	));
	await shot('03-slash-menu');

	// filter + keyboard select "Quote" via ArrowDown/Enter
	await page.keyboard.type('qu', { delay: 20 });
	await page.waitForTimeout(200);
	console.log('filtered items:', await page.evaluate(() =>
		[...document.querySelectorAll('[role="listbox"] [role="option"]')].map((el) => el.textContent)
	));
	await page.keyboard.press('Enter');
	await page.waitForTimeout(200);
	const menuGone = await page.evaluate(() => !document.querySelector('[role="listbox"]'));
	console.log('menu closed after Enter:', menuGone);
	console.log('doc html:', await page.evaluate(() => document.querySelector('.tiptap').innerHTML));
	await shot('04-after-command');

	// Enter should submit: input clears and a user message appears
	await page.keyboard.press('Enter');
	await page.waitForTimeout(1500);
	const after = await page.evaluate(() => ({
		editorText: document.querySelector('.tiptap')?.innerText,
		bodyHasMessage: document.body.innerText.includes('Hello from tiptap'),
	}));
	console.log('after Enter submit:', JSON.stringify(after));
	await shot('05-after-submit');
} finally {
	await app.close().catch(() => {});
}
console.log('done');
