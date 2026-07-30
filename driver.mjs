import { _electron } from 'playwright-core';
import fs from 'node:fs';

const SETTINGS =
	'/Users/haraldbregu/Library/Application Support/Friday/app/settings.json';

let app;
try {
	app = await _electron.launch({
		executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
		args: ['.'],
	});
	const page = await app.firstWindow();
	await page.waitForLoadState('domcontentloaded');
	await page.waitForTimeout(3000);

	// Same runtime the user's old cron store holds, so the end state matches their config
	const result = await page.evaluate(async () => {
		const runtime = await window.cron.setRuntime('deepseek', 'deepseek-v4-flash');
		const roundTrip = await window.cron.getRuntime();
		const schedules = await window.cron.list();
		return { runtime, roundTrip, schedules };
	});
	console.log('ipc result:', JSON.stringify(result));

	const saved = JSON.parse(fs.readFileSync(SETTINGS, 'utf-8'));
	console.log('cron_configuration:', JSON.stringify(saved.cron_configuration));
	console.log('assistant_configuration:', JSON.stringify(saved.assistant_configuration));
	console.log('ALL OK');
} catch (error) {
	console.error('FAILED:', error?.message ?? error);
} finally {
	await app?.close().catch(() => {});
	fs.writeFileSync(
		'/private/tmp/claude-501/-Users-haraldbregu-Documents-friday/6adac7e1-1491-4f74-b9cc-bc814962df69/scratchpad/driver-done',
		'done'
	);
	process.exit(0);
}
