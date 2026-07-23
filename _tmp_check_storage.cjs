const { _electron: electron } = require('playwright');
const path = require('node:path');

async function main() {
	const MAIN_ENTRY = path.resolve(__dirname, 'out/main/index.js');

	const app = await electron.launch({
		args: [MAIN_ENTRY],
		env: { ...process.env, NODE_ENV: 'development', ELECTRON_RENDERER_URL: '' },
	});

	const page = await app.firstWindow();
	await page.waitForLoadState('domcontentloaded');

	let consoleHitCount = 0;
	page.on('console', (msg) => {
		consoleHitCount += 1;
		console.log(`[RENDERER console:${msg.type()}]`, msg.text());
	});
	page.on('pageerror', (err) => console.log('[RENDERER pageerror]', err.message, '\n', err.stack));

	await page.waitForTimeout(500);
	await page.evaluate(() => console.log('MARKER_TEST_FROM_EVALUATE'));
	await page.waitForTimeout(300);
	console.log('consoleHitCount after marker =', consoleHitCount);

	console.log('--- navigate to storage ---');
	await page.evaluate(() => { window.location.hash = '#/settings/storage'; });
	await page.waitForTimeout(1000);

	console.log('--- add provider ---');
	await page.getByRole('button', { name: /add provider/i }).click();
	await page.waitForTimeout(500);

	await page.getByLabel('Name', { exact: true }).fill('Test Provider');
	await page.getByLabel('Endpoint URL').fill('https://example.com');
	await page.getByLabel('Bucket').fill('my-bucket');
	await page.getByLabel('Access key ID').fill('AKIAEXAMPLE');
	await page.getByLabel('Secret access key').fill('secretexample');
	await page.waitForTimeout(300);

	console.log('--- click Save ---');
	await page.getByRole('button', { name: /^save$/i }).click();
	await page.waitForTimeout(1000);

	const afterSaveText = await page.locator('#root').innerText();
	console.log('=== TEXT AFTER SAVE ===');
	console.log(afterSaveText);
	console.log('=== END ===');
	await page.screenshot({ path: path.resolve(__dirname, '_tmp_screenshot_after_save.png') });

	console.log('--- click Edit on saved card ---');
	await page.getByRole('button', { name: /^edit$/i }).click().catch((e) => console.log('edit click error', e.message));
	await page.waitForTimeout(500);
	const afterEditText = await page.locator('#root').innerText();
	console.log('=== TEXT AFTER EDIT CLICK ===');
	console.log(afterEditText);
	console.log('=== END ===');

	console.log('final consoleHitCount =', consoleHitCount);

	await app.close();
}

main().catch((err) => {
	console.error('SCRIPT ERROR', err);
	process.exit(1);
});
