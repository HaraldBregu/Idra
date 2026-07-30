import { _electron } from 'playwright-core';
import fs from 'node:fs';

const SHOT = '/private/tmp/claude-501/-Users-haraldbregu-Documents-friday/6adac7e1-1491-4f74-b9cc-bc814962df69/scratchpad/';

let app;
try {
	app = await _electron.launch({
		executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
		args: ['.'],
	});
	const page = await app.firstWindow();
	await page.waitForLoadState('domcontentloaded');

	// Step 1: Welcome
	await page.getByRole('button', { name: 'Get started' }).waitFor({ timeout: 30000 });
	console.log('STEP welcome:', await page.getByText(/of 3/).first().textContent());
	await page.screenshot({ path: SHOT + '11-welcome.png' });
	await page.getByRole('button', { name: 'Get started' }).click();

	// Step 2: Providers
	await page.getByText('Connect your providers').waitFor({ timeout: 15000 });
	await page.waitForTimeout(1500);
	console.log('STEP providers:', await page.getByText(/of 3/).first().textContent());
	await page.screenshot({ path: SHOT + '12-providers.png' });

	// Step 3: Models
	await page.getByRole('button', { name: 'Continue' }).click();
	await page.getByText('Choose your models').waitFor({ timeout: 15000 });
	await page.waitForTimeout(2500);
	console.log('STEP models:', await page.getByText(/of 3/).first().textContent());
	for (const svc of ['Assistant', 'Voice', 'Transcription', 'Image', 'Video', 'Audio']) {
		console.log(`service "${svc}":`, await page.getByText(svc, { exact: true }).count());
	}
	console.log(
		'no-providers notice count:',
		await page.getByText('No providers configured yet').count()
	);
	await page.screenshot({ path: SHOT + '13-models.png' });

	// Open the assistant model dropdown to confirm groups are populated
	const trigger = page.locator('[id^="setup-assistant"]').first();
	await trigger.click().catch(async () => {
		await page.getByText('Select model').first().click();
	});
	await page.waitForTimeout(800);
	await page.screenshot({ path: SHOT + '14-models-open.png' });
	const options = await page.getByRole('option').count();
	console.log('assistant model options:', options);
	await page.keyboard.press('Escape');

	const finish = page.getByRole('button', { name: 'Finish' });
	console.log('finish disabled:', await finish.isDisabled());

	// Back navigation sanity check (no state written)
	await page.getByRole('button', { name: 'Back' }).click();
	await page.getByText('Connect your providers').waitFor({ timeout: 10000 });
	console.log('back to providers ok');

	console.log('ALL OK');
} catch (error) {
	console.error('FAILED:', error?.message ?? error);
	try {
		const page = await app?.firstWindow();
		await page?.screenshot({ path: SHOT + 'error2.png' });
	} catch {}
} finally {
	await app?.close().catch(() => {});
	fs.writeFileSync(SHOT + 'driver-done', 'done');
	process.exit(0);
}
