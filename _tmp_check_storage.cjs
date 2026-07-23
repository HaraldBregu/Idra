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
	await page.waitForTimeout(500);

	page.on('console', (msg) => console.log(`[console:${msg.type()}]`, msg.text()));
	page.on('pageerror', (err) => console.log('[pageerror]', err.message, err.stack));

	await page.evaluate(() => {
		window.location.hash = '#/settings';
	});
	await page.waitForTimeout(1500);

	const fullText = await page.locator('#root').innerText();
	console.log('=== FULL TEXT ===');
	console.log(fullText);
	console.log('=== END FULL TEXT ===');

	await app.close();
}

main().catch((err) => {
	console.error('SCRIPT ERROR', err);
	process.exit(1);
});
