const { _electron: electron } = require('playwright');
const path = require('node:path');

async function main() {
	const MAIN_ENTRY = path.resolve(__dirname, 'out/main/index.js');

	const app = await electron.launch({
		args: [MAIN_ENTRY],
		env: { ...process.env, NODE_ENV: 'production', ELECTRON_RENDERER_URL: '' },
	});

	const page = await app.firstWindow();
	await page.waitForLoadState('domcontentloaded');

	const consoleMessages = [];
	page.on('console', (msg) => {
		consoleMessages.push(`[console:${msg.type()}] ${msg.text()}`);
	});
	page.on('pageerror', (err) => {
		consoleMessages.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`);
	});

	// Overview: scroll down to see the new Cloud section (Storage + Database)
	await page.evaluate(() => {
		window.location.hash = '#/settings';
	});
	await page.waitForTimeout(1200);
	await page.mouse.wheel(0, 900);
	await page.waitForTimeout(500);
	await page.screenshot({ path: path.resolve(__dirname, '_tmp_screenshot_overview_scrolled.png') });

	const cloudSectionText = await page.locator('#root').innerText().catch(() => '');
	consoleMessages.push(`overview contains "Cloud": ${cloudSectionText.includes('Cloud')}`);
	consoleMessages.push(`overview contains "Database": ${cloudSectionText.includes('Database')}`);
	consoleMessages.push(`overview contains "Storage": ${cloudSectionText.includes('Storage')}`);

	// Storage page: click "Add provider" to render a fresh ProviderCard in edit mode
	await page.evaluate(() => {
		window.location.hash = '#/settings/storage';
	});
	await page.waitForTimeout(800);
	await page.getByRole('button', { name: /add provider/i }).click();
	await page.waitForTimeout(500);
	await page.screenshot({ path: path.resolve(__dirname, '_tmp_screenshot_new_provider.png') });

	const bodyText = await page.locator('#root').innerText().catch(() => '(could not read #root)');
	consoleMessages.push(`crashed after add provider=${bodyText.includes('This page crashed')}`);

	console.log(consoleMessages.join('\n'));

	await app.close();
}

main().catch((err) => {
	console.error('SCRIPT ERROR', err);
	process.exit(1);
});
