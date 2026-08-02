import { _electron } from 'playwright-core';

const OUT = '/private/tmp/claude-501/-Users-haraldbregu-Documents-friday/cde653d6-717c-4869-a5c1-4692962926c9/scratchpad';

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

// --- Channels page: list only, sourced from app IPC ---
await goto('#/settings/channels');
await page.screenshot({ path: `${OUT}/channels.png` });
console.log('CHANNELS PAGE TEXT:\n' + (await page.locator('main, body').first().innerText()));

const ipcChannels = await page.evaluate(() => window.app.getChannels());
console.log('IPC getChannels keys: ' + JSON.stringify(Object.keys(ipcChannels)));
console.log('IPC defaultChannel before: ' + JSON.stringify(ipcChannels.defaultChannel));

// --- Application page: default channel selector ---
await goto('#/settings/application');
const heading = page.getByText('Default channel', { exact: true }).first();
await heading.waitFor({ timeout: 10000 });
await page.screenshot({ path: `${OUT}/application.png`, fullPage: true });

// Open the collapsible card, then the select, then pick Telegram.
const card = page.locator('button:has-text("No default channel")').first();
await card.click();
await page.waitForTimeout(600);
await page.locator('[aria-label="Default channel"]').first().click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/select-open.png` });
await page.getByRole('option', { name: 'Telegram' }).first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/after-select.png` });

const after = await page.evaluate(() => window.app.getChannels());
console.log('IPC defaultChannel after: ' + JSON.stringify(after.defaultChannel));
console.log('APPLICATION PAGE (default channel card):\n' + (await page.locator('button:has-text("Telegram")').first().innerText()));

console.log('CONSOLE ERRORS: ' + JSON.stringify(errors, null, 1));
await app.close();
