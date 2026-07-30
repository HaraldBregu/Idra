import { _electron } from 'playwright-core';
import fs from 'node:fs';

const SETTINGS =
	'/Users/haraldbregu/Library/Application Support/Friday/app/settings.json';
const before = fs.readFileSync(SETTINGS, 'utf-8');

let app;
try {
	app = await _electron.launch({
		executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
		args: ['.'],
	});
	app.process().stdout?.on('data', (d) => console.log('[main]', String(d).trim()));
	app.process().stderr?.on('data', (d) => console.log('[main:err]', String(d).trim()));
	const page = await app.firstWindow();
	page.on('console', (msg) => {
		if (msg.type() === 'error') console.log('[renderer:err]', msg.text());
	});
	await page.waitForLoadState('domcontentloaded');
	console.log('page url:', page.url());
	await page.getByRole('button', { name: 'Get started' }).waitFor({ timeout: 30000 });

	const result = await page.evaluate(async () => {
		const runtime = await window.cron.setRuntime('anthropic', 'claude-fable-5');
		const roundTrip = await window.cron.getRuntime();
		const schedules = await window.cron.list();
		return { runtime, roundTrip, schedules };
	});
	console.log('ipc result:', JSON.stringify(result));

	const saved = JSON.parse(fs.readFileSync(SETTINGS, 'utf-8'));
	console.log('cron_configuration:', JSON.stringify(saved.cron_configuration));
	console.log('ALL OK');
} catch (error) {
	console.error('FAILED:', error?.message ?? error);
} finally {
	await app?.close().catch(() => {});
	fs.writeFileSync(SETTINGS, before);
	console.log('settings.json restored:', fs.readFileSync(SETTINGS, 'utf-8') === before);
	fs.writeFileSync(
		'/private/tmp/claude-501/-Users-haraldbregu-Documents-friday/6adac7e1-1491-4f74-b9cc-bc814962df69/scratchpad/driver-done',
		'done'
	);
	process.exit(0);
}
