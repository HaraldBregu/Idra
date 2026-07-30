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
	const page = await app.firstWindow();
	await page.waitForLoadState('domcontentloaded');
	await page.getByRole('button', { name: 'Get started' }).waitFor({ timeout: 30000 });

	// Exercise the exact IPC path the models step's Finish uses for the assistant
	const result = await page.evaluate(async () => {
		const provider = await window.provider.get('anthropic');
		const setProviderOk = await window.agent.setProvider({
			id: provider.id,
			name: provider.name,
			baseUrl: provider.baseUrl,
		});
		const setModelOk = await window.agent.setModelId('claude-fable-5');
		return {
			setProviderOk,
			setModelOk,
			providerId: (await window.agent.getProvider())?.id,
			modelId: await window.agent.getModelId(),
		};
	});
	console.log('ipc result:', JSON.stringify(result));

	const saved = JSON.parse(fs.readFileSync(SETTINGS, 'utf-8'));
	console.log('assistant_configuration:', JSON.stringify(saved.assistant_configuration));
	console.log('legacy modelProviderId present:', 'modelProviderId' in saved);
	console.log('legacy modelId present:', 'modelId' in saved);
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
