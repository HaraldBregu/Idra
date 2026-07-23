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

	const routes = ['/settings', '/settings/storage'];

	for (const route of routes) {
		consoleMessages.push(`--- navigating to ${route} ---`);
		await page.evaluate((hash) => {
			window.location.hash = `#${hash}`;
		}, route);
		await page.waitForTimeout(1500);
		const bodyText = await page.locator('#root').innerText().catch(() => '(could not read #root)');
		const crashed = bodyText.includes('This page crashed');
		consoleMessages.push(`crashed=${crashed}`);
		await page.screenshot({ path: path.resolve(__dirname, `_tmp_screenshot_${route.replace(/\//g, '_')}.png`) });
	}

	console.log(consoleMessages.join('\n'));

	await app.close();
}

main().catch((err) => {
	console.error('SCRIPT ERROR', err);
	process.exit(1);
});
