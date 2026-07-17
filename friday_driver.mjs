// REPL driver for the Friday Electron app (macOS, headed).
import { _electron as electron } from 'playwright-core';
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';

const APP_DIR = '/Users/haraldbregu/Documents/friday';
const SHOT_DIR = process.env.SCREENSHOT_DIR || '/tmp/claude/shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

let app = null;
let page = null;

const electronBin = path.join(
	APP_DIR,
	'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'
);

const COMMANDS = {
	async launch() {
		if (app) return console.log('already launched');
		app = await electron.launch({
			executablePath: electronBin,
			args: [APP_DIR],
			timeout: 30_000,
		});
		await new Promise((r) => setTimeout(r, 6_000));
		page = app.windows().find((w) => !w.url().startsWith('devtools://')) ?? (await app.firstWindow());
		console.log('launched.', app.windows().length, 'windows:');
		for (const w of app.windows()) console.log(' ', w.url());
	},

	async ss(name) {
		if (!page) return console.log('ERROR: launch first');
		const f = path.join(SHOT_DIR, (name || `ss-${Date.now()}`) + '.png');
		await page.screenshot({ path: f });
		console.log('screenshot:', f);
	},

	async click(sel) {
		if (!page) return console.log('ERROR: launch first');
		const r = await page.evaluate((s) => {
			const el = document.querySelector(s);
			if (!el) return 'NOT_FOUND';
			el.click();
			return 'OK';
		}, sel);
		console.log('click', sel, '→', r);
	},

	async 'click-text'(text) {
		if (!page) return console.log('ERROR: launch first');
		const r = await page.evaluate((t) => {
			const els = [...document.querySelectorAll('button, a, [role="button"], [role="option"]')];
			const el = els.find((e) => e.textContent?.trim() === t) ?? els.find((e) => e.textContent?.includes(t));
			if (!el) return 'NOT_FOUND';
			el.click();
			return 'OK: ' + el.tagName + ' ' + (el.textContent || '').slice(0, 40);
		}, text);
		console.log('click-text', JSON.stringify(text), '→', r);
	},

	async focus(sel) {
		if (!page) return console.log('ERROR: launch first');
		const r = await page.evaluate((s) => {
			const el = document.querySelector(s);
			if (!el) return 'NOT_FOUND';
			el.focus();
			return 'OK';
		}, sel);
		console.log('focus', sel, '→', r);
	},

	async type(text) {
		if (page) await page.keyboard.type(text, { delay: 40 });
		console.log('typed', JSON.stringify(text));
	},
	async press(key) {
		if (page) await page.keyboard.press(key);
		console.log('pressed', key);
	},

	async menu() {
		if (!page) return console.log('ERROR: launch first');
		const r = await page.evaluate(() => {
			const box = document.querySelector('[role="listbox"][aria-label="Slash commands"]');
			if (!box) return { present: false };
			const style = getComputedStyle(box);
			const rect = box.getBoundingClientRect();
			return {
				present: true,
				items: [...box.querySelectorAll('[role="option"], p')].map((e) => e.textContent),
				rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
				visibility: style.visibility,
				display: style.display,
				parentVisibility: box.parentElement ? getComputedStyle(box.parentElement).visibility : null,
				parentRect: box.parentElement ? box.parentElement.getBoundingClientRect().toJSON() : null,
			};
		});
		console.log(JSON.stringify(r, null, 1));
	},

	async editor() {
		if (!page) return console.log('ERROR: launch first');
		const r = await page.evaluate(() => {
			const el = document.querySelector('[role="textbox"]');
			return el ? { found: true, text: el.textContent, html: el.innerHTML.slice(0, 300) } : { found: false };
		});
		console.log(JSON.stringify(r, null, 1));
	},

	async skills() {
		if (!page) return console.log('ERROR: launch first');
		const r = await page.evaluate(async () => {
			try {
				const list = await window.agent.skillsList();
				return list.map((s) => s.name);
			} catch (e) {
				return 'ERROR: ' + String(e);
			}
		});
		console.log(JSON.stringify(r));
	},

	// Debug REPL command for local bug reproduction only — arbitrary JS in the
	// page is the point here; never ships with the app.
	async eval(expr) {
		if (!page) return console.log('ERROR: launch first');
		try {
			console.log(JSON.stringify(await page.evaluate(expr)));
		} catch (e) {
			console.log('ERROR:', e.message);
		}
	},

	async text(sel) {
		if (!page) return console.log('ERROR: launch first');
		console.log(
			await page.evaluate((s) => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)', sel || null)
		);
	},

	async quit() {
		if (app) await app.close().catch(() => {});
		app = null;
		page = null;
	},
	help() {
		console.log('commands:', Object.keys(COMMANDS).join(', '));
	},
};

const stdin = fs.createReadStream(null, { fd: fs.openSync('/dev/stdin', 'r') });
const rl = readline.createInterface({ input: stdin, output: process.stdout, prompt: 'driver> ' });

rl.on('line', async (line) => {
	const [cmd, ...rest] = line.trim().split(/\s+/);
	if (!cmd) return rl.prompt();
	const fn = COMMANDS[cmd];
	if (!fn) {
		console.log('unknown:', cmd, '— try: help');
		return rl.prompt();
	}
	try {
		await fn(rest.join(' '));
	} catch (e) {
		console.log('ERROR:', e.message);
	}
	if (cmd === 'quit') {
		rl.close();
		process.exit(0);
	}
	rl.prompt();
});
rl.on('close', async () => {
	await COMMANDS.quit();
	process.exit(0);
});

console.log('friday driver — "help" for commands, "launch" to start');
rl.prompt();
