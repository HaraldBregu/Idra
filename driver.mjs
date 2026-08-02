import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { _electron } from 'playwright-core';

const OUT = '/private/tmp/claude-501/-Users-haraldbregu-Documents-friday/cde653d6-717c-4869-a5c1-4692962926c9/scratchpad';
const STORE = join(homedir(), '.friday/app/settings.channels.json');

const app = await _electron.launch({
	executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
	args: ['./out/main/index.js'],
});

const page = await app.firstWindow();
const errors = [];
page.on('console', (msg) => {
	if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(4000);

async function goto(hash) {
	await page.evaluate((h) => {
		window.location.hash = h;
	}, hash);
	await page.waitForTimeout(2500);
}

await goto('#/settings/channels');
console.log('CHANNELS LIST:\n' + (await page.locator('main, body').first().innerText()));

await goto('#/settings/application');
await page.getByText('Default channel', { exact: true }).first().waitFor({ timeout: 10000 });
await page.locator('button:has-text("No default channel")').first().click();
await page.waitForTimeout(600);
await page.locator('[aria-label="Default channel"]').first().click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/select2-open.png` });
console.log('OPTIONS: ' + (await page.getByRole('option').allInnerTexts()).join(' | '));

await page.getByRole('option').first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/after-select2.png` });

const config = await page.evaluate(() => window.app.getChannels());
console.log('IPC providerId: ' + JSON.stringify(config.providerId));
console.log('IPC channelId: ' + JSON.stringify(config.channelId));
console.log('IPC keys: ' + JSON.stringify(Object.keys(config)));
console.log('CARD:\n' + (await page.locator('button:has-text("Telegram")').first().innerText()));

await app.close();
await new Promise((resolve) => setTimeout(resolve, 1500));
console.log('STORE FILE:\n' + (existsSync(STORE) ? readFileSync(STORE, 'utf-8') : '(missing)'));
console.log('CONSOLE ERRORS: ' + JSON.stringify(errors, null, 1));
