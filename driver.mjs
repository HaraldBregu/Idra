import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { _electron } from 'playwright-core';

const OUT = '/private/tmp/claude-501/-Users-haraldbregu-Documents-friday/cde653d6-717c-4869-a5c1-4692962926c9/scratchpad';
const CHANNELS = join(homedir(), '.friday/app/settings.channels.json');
const SETTINGS = join(homedir(), '.friday/app/settings.json');

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

// 1. Channels list
await goto('#/settings/channels');
await page.screenshot({ path: `${OUT}/ch-list.png` });
console.log('CHANNELS LIST:\n' + (await page.locator('main, body').first().innerText()));

// 2. Detail: token + allowlist land on the bot credential
await page.locator('button:has-text("Telegram")').first().click();
await page.waitForTimeout(2000);
await page.locator('#telegram-token').fill('verify-token-123');
await page.locator('#telegram-token').blur();
await page.waitForTimeout(800);
await page.locator('#telegram-allow-from').fill('99887766');
await page.locator('#telegram-allow-from').press('Enter');
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/ch-detail.png`, fullPage: true });

console.log('STORED BOTS: ' + JSON.stringify(await page.evaluate(() => window.provider.list())));

// 3. Default channel selection
await goto('#/settings/application');
await page.locator('button:has-text("No default channel")').first().click();
await page.waitForTimeout(600);
await page.locator('[aria-label="Default channel"]').first().click();
await page.waitForTimeout(600);
await page.getByRole('option').first().click();
await page.waitForTimeout(1500);
console.log('IPC getChannels: ' + JSON.stringify(await page.evaluate(() => window.app.getChannels())));

// 4. Back to the list — should now read as configured
await goto('#/settings/channels');
await page.screenshot({ path: `${OUT}/ch-list-after.png` });
console.log('CHANNELS LIST AFTER:\n' + (await page.locator('main, body').first().innerText()));

await app.close();
await new Promise((resolve) => setTimeout(resolve, 1500));
console.log('\n=== settings.channels.json ===\n' + (existsSync(CHANNELS) ? readFileSync(CHANNELS, 'utf-8') : '(missing)'));
console.log('=== settings.json bots ===\n' + JSON.stringify(JSON.parse(readFileSync(SETTINGS, 'utf-8')).bots, null, 1));
console.log('CONSOLE ERRORS: ' + JSON.stringify(errors, null, 1));
