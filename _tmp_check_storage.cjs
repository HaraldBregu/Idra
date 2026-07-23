const { _electron: electron } = require('playwright');
const path = require('node:path');

async function main() {
	const MAIN_ENTRY = path.resolve(__dirname, 'out/main/index.js');
	const REAL_USER_DATA = 'C:\\Users\\BRGHLD87H\\AppData\\Roaming\\Friday';

	const app = await electron.launch({
		args: [MAIN_ENTRY, `--user-data-dir=${REAL_USER_DATA}`],
		env: { ...process.env, NODE_ENV: 'development', ELECTRON_RENDERER_URL: '' },
	});

	const userDataPath = await app.evaluate(({ app }) => app.getPath('userData'));
	console.log('userData path:', userDataPath);

	const page = await app.firstWindow();
	await page.waitForLoadState('domcontentloaded');

	page.on('console', (msg) => console.log(`[RENDERER console:${msg.type()}]`, msg.text()));
	page.on('pageerror', (err) => console.log('[RENDERER pageerror]', err.message, '\n', err.stack));

	await page.waitForTimeout(800);

	console.log('--- navigate to storage (pointed at REAL Friday user data dir) ---');
	await page.evaluate(() => { window.location.hash = '#/settings/storage'; });
	await page.waitForTimeout(1500);

	const text = await page.locator('#root').innerText().catch((e) => `ERROR READING TEXT: ${e.message}`);
	console.log('=== TEXT ===');
	console.log(text);
	console.log('=== END ===');
	console.log('crashed=', text.includes('This page crashed'));

	await page.screenshot({ path: path.resolve(__dirname, '_tmp_screenshot_real_data_2.png') });

	await app.close();
}

main().catch((err) => {
	console.error('SCRIPT ERROR', err);
	process.exit(1);
});
