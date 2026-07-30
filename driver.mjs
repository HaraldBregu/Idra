import { _electron } from 'playwright-core';
import fs from 'node:fs';

const SHOT = '/private/tmp/claude-501/-Users-haraldbregu-Documents-friday/6adac7e1-1491-4f74-b9cc-bc814962df69/scratchpad/';
const SETTINGS =
	'/Users/haraldbregu/Library/Application Support/Friday/app/settings.json';
const before = fs.readFileSync(SETTINGS, 'utf-8');

let app;
try {
	app = await _electron.launch({
		executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
		args: ['.'],
	});
	app.process().stderr?.on('data', (d) => console.log('[main:err]', String(d).trim()));
	const page = await app.firstWindow();
	page.on('console', (msg) => console.log(`[renderer:${msg.type()}]`, msg.text().slice(0, 300)));
	page.on('pageerror', (err) => console.log('[pageerror]', err.message));
	await page.waitForLoadState('domcontentloaded');
	await page.waitForTimeout(10000);
	console.log('url:', page.url());
	await page.screenshot({ path: SHOT + '20-diagnostic.png' });
	const text = await page.evaluate(() => document.body.innerText.slice(0, 500));
	console.log('body text:', JSON.stringify(text));
	const agentProbe = await page.evaluate(async () => {
		const timeout = new Promise((resolve) => setTimeout(() => resolve('TIMEOUT'), 5000));
		const provider = await Promise.race([window.agent.getProvider(), timeout]);
		const modelId = await Promise.race([window.agent.getModelId(), timeout]);
		return { provider, modelId };
	});
	console.log('agent probe:', JSON.stringify(agentProbe));
} catch (error) {
	console.error('FAILED:', error?.message ?? error);
} finally {
	await app?.close().catch(() => {});
	fs.writeFileSync(SETTINGS, before);
	fs.writeFileSync(SHOT + 'driver-done', 'done');
	process.exit(0);
}
