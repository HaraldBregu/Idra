import { _electron } from 'playwright-core';
import fs from 'node:fs';

const SHOT = '/private/tmp/claude-501/-Users-haraldbregu-Documents-friday/6adac7e1-1491-4f74-b9cc-bc814962df69/scratchpad/';
const FAKEHOME = SHOT + 'fakehome';
fs.mkdirSync(FAKEHOME, { recursive: true });

let app;
try {
	app = await _electron.launch({
		executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
		args: ['.'],
		env: { ...process.env, HOME: FAKEHOME },
	});
	const page = await app.firstWindow();
	await page.waitForLoadState('domcontentloaded');

	// Step 1: Welcome
	await page.getByRole('button', { name: 'Get started' }).waitFor({ timeout: 30000 });
	console.log('STEP welcome: visible, url=', page.url());
	console.log('progress:', await page.getByText(/of 3/).first().textContent().catch(() => 'MISSING'));
	await page.screenshot({ path: SHOT + '01-welcome.png' });
	await page.getByRole('button', { name: 'Get started' }).click();

	// Step 2: Providers (embedded settings page)
	await page.getByText('Connect your providers').waitFor({ timeout: 15000 });
	await page.waitForTimeout(1500);
	console.log('STEP providers: header visible');
	console.log('progress:', await page.getByText(/of 3/).first().textContent().catch(() => 'MISSING'));
	for (const section of ['Models', 'Database']) {
		const found = await page
			.locator('h2', { hasText: new RegExp(`^${section}$`, 'i') })
			.count();
		console.log(`section "${section}" count:`, found);
	}
	console.log(
		'storage section present:',
		(await page.getByText('S3', { exact: false }).count()) > 0
	);
	await page.screenshot({ path: SHOT + '02-providers.png', fullPage: false });

	// Continue with no key -> expect error
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByText('Add at least one model provider API key').waitFor({ timeout: 10000 });
	console.log('STEP providers: empty-continue error shown');
	await page.screenshot({ path: SHOT + '03-providers-error.png' });

	// Save a fake key on the first (auto-editing) provider card
	const keyInput = page.locator('input[type="password"]').first();
	await keyInput.fill('sk-test-1234567890');
	await page.getByRole('button', { name: 'Save', exact: true }).click();
	await page.getByText('sk-************').waitFor({ timeout: 10000 });
	console.log('STEP providers: key saved, masked label shown');
	await page.screenshot({ path: SHOT + '04-provider-saved.png' });

	// Continue -> Models step
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByText('Choose your models').waitFor({ timeout: 15000 });
	await page.waitForTimeout(2500);
	console.log('STEP models: header visible');
	console.log('progress:', await page.getByText(/of 3/).first().textContent().catch(() => 'MISSING'));
	for (const svc of ['Assistant', 'Voice', 'Transcription', 'Image', 'Video', 'Audio']) {
		console.log(`service "${svc}":`, await page.getByText(svc, { exact: true }).count());
	}
	await page.screenshot({ path: SHOT + '05-models.png' });

	// Finish -> home
	const finish = page.getByRole('button', { name: 'Finish' });
	console.log('finish disabled:', await finish.isDisabled());
	await finish.click();
	await page.waitForURL(/home/, { timeout: 20000 });
	console.log('STEP finish: navigated to', page.url());
	await page.waitForTimeout(1500);
	await page.screenshot({ path: SHOT + '06-home.png' });

	console.log('ALL OK');
} catch (error) {
	console.error('FAILED:', error?.message ?? error);
	try {
		const page = await app?.firstWindow();
		await page?.screenshot({ path: SHOT + 'error.png' });
	} catch {}
} finally {
	await app?.close().catch(() => {});
	fs.writeFileSync(SHOT + 'driver-done', 'done');
	process.exit(0);
}
