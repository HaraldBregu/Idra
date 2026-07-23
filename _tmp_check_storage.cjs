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

	page.on('console', (msg) => console.log(`[console:${msg.type()}]`, msg.text()));
	page.on('pageerror', (err) => console.log('[pageerror]', err.message, '\n', err.stack));

	await page.waitForTimeout(1000);

	console.log('--- overview ---');
	await page.evaluate(() => { window.location.hash = '#/settings'; });
	await page.waitForTimeout(1500);

	console.log('--- storage list ---');
	await page.evaluate(() => { window.location.hash = '#/settings/storage'; });
	await page.waitForTimeout(1000);

	console.log('--- add provider ---');
	await page.getByRole('button', { name: /add provider/i }).click();
	await page.waitForTimeout(800);

	console.log('--- fill name field ---');
	const nameInput = page.getByLabel('Name', { exact: true });
	await nameInput.fill('Test R2').catch((e) => console.log('name fill error', e.message));
	await page.waitForTimeout(300);

	console.log('--- fill endpoint/region/bucket ---');
	await page.getByLabel('Endpoint URL').fill('https://abc123.r2.cloudflarestorage.com').catch((e) => console.log('endpoint fill error', e.message));
	await page.getByLabel('Bucket').fill('my-bucket').catch((e) => console.log('bucket fill error', e.message));
	await page.getByLabel('Access key ID').fill('AKIAEXAMPLE').catch((e) => console.log('accesskey fill error', e.message));
	await page.getByLabel('Secret access key').fill('secretexample').catch((e) => console.log('secretkey fill error', e.message));
	await page.waitForTimeout(500);

	console.log('--- toggle force path style ---');
	await page.getByRole('switch').first().click().catch((e) => console.log('switch error', e.message));
	await page.waitForTimeout(300);

	console.log('--- click Test connection ---');
	await page.getByRole('button', { name: /test connection/i }).click().catch((e) => console.log('test click error', e.message));
	await page.waitForTimeout(2000);

	const afterTestText = await page.locator('#root').innerText();
	console.log('=== TEXT AFTER TEST ===');
	console.log(afterTestText);
	console.log('=== END ===');

	await page.screenshot({ path: path.resolve(__dirname, '_tmp_screenshot_filled_card.png') });

	await app.close();
}

main().catch((err) => {
	console.error('SCRIPT ERROR', err);
	process.exit(1);
});
