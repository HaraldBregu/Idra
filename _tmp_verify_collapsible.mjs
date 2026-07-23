import { _electron as electron } from '@playwright/test';
import path from 'node:path';

const MAIN_ENTRY = path.resolve(
	'C:/Users/BRGHLD87H/OneDrive - DEDAGROUP SPA/Documenti/friday/out/main/index.js'
);
const SHOT_DIR =
	'C:/Users/BRGHLD~1/AppData/Local/Temp/claude/C--Users-BRGHLD87H-OneDrive---DEDAGROUP-SPA-Documenti-friday/3c4d0353-5dca-4278-982e-3d9f156c5ff8/scratchpad';

async function main() {
	const app = await electron.launch({
		args: [MAIN_ENTRY],
		env: { ...process.env, NODE_ENV: 'production', ELECTRON_RENDERER_URL: '' },
	});
	const page = await app.firstWindow();
	await page.waitForLoadState('domcontentloaded');

	await page.evaluate(() => {
		window.location.hash = '#/settings/storage';
	});
	await page.waitForTimeout(800);

	const addButton = page.getByRole('button', { name: /add provider/i });
	await addButton.click();
	await page.waitForTimeout(300);
	await page.screenshot({ path: `${SHOT_DIR}/1_new_card_expanded.png` });

	await page.getByLabel('Name').fill('Test Provider');
	await page.getByLabel('Bucket').fill('test-bucket');
	await page.getByLabel('Access key ID').fill('AKIATEST');
	await page.getByLabel('Secret access key').fill('secret123456');
	await page.getByRole('button', { name: /^save$/i }).click();
	await page.waitForTimeout(500);
	await page.screenshot({ path: `${SHOT_DIR}/2_after_save_expanded.png` });

	const collapseButton = page.getByRole('button', { name: /collapse/i }).first();
	await collapseButton.click();
	await page.waitForTimeout(500);
	await page.screenshot({ path: `${SHOT_DIR}/3_collapsed.png` });

	const expandButton = page.getByRole('button', { name: /expand/i }).first();
	await expandButton.click();
	await page.waitForTimeout(500);
	await page.screenshot({ path: `${SHOT_DIR}/4_expanded_again.png` });

	await page
		.getByRole('button', { name: /collapse/i })
		.first()
		.click();
	await page.waitForTimeout(500);
	await page.screenshot({ path: `${SHOT_DIR}/5_collapsed_before_edit.png` });

	const editVisible = await page
		.getByRole('button', { name: /^edit$/i })
		.first()
		.isVisible()
		.catch(() => false);

	console.log(JSON.stringify({ editButtonVisibleWhileCollapsed: editVisible }));

	await app.close();
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
