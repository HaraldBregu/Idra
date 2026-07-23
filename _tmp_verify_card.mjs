import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';

const SHOT_DIR = '/tmp/friday_shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const ADD = /add provider|aggiungi provider/i;
const COLLAPSE = /collapse|comprimi/i;
const EXPAND = /^(expand|espandi)$/i;
const REMOVE = /remove provider|rimuovi provider/i;
const TEST = /test connection|prova connessione/i;

async function main() {
	const app = await electron.launch({
		executablePath:
			'/Users/haraldbregu/Documents/friday/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
		args: ['/Users/haraldbregu/Documents/friday/out/main/index.js'],
		env: { ...process.env, NODE_ENV: 'production', ELECTRON_RENDERER_URL: '' },
	});

	const userData = await app.evaluate(({ app: a }) => a.getPath('userData'));
	console.log('userData:', userData);

	let page = await app.firstWindow();
	await page.waitForLoadState('domcontentloaded');
	await page.evaluate(() => {
		window.location.hash = '#/settings/storage';
	});
	await page.waitForTimeout(1000);

	if (!(await page.getByRole('button', { name: ADD }).isVisible().catch(() => false))) {
		for (const w of app.windows()) {
			await w
				.evaluate(() => {
					window.location.hash = '#/settings/storage';
				})
				.catch(() => {});
			await w.waitForTimeout(800);
			if (await w.getByRole('button', { name: ADD }).isVisible().catch(() => false)) {
				page = w;
				break;
			}
		}
	}

	await page.screenshot({ path: `${SHOT_DIR}/0_page.png` });

	await page.getByRole('button', { name: ADD }).click();
	await page.waitForTimeout(400);
	await page.screenshot({ path: `${SHOT_DIR}/1_new_expanded.png` });

	const card = page.locator('[data-slot=card]').last();

	await card.getByRole('button', { name: TEST }).click();
	await page.waitForTimeout(2000);
	await page.screenshot({ path: `${SHOT_DIR}/2_notice.png` });

	await card.getByRole('button', { name: COLLAPSE }).click();
	await page.waitForTimeout(600);
	await page.screenshot({ path: `${SHOT_DIR}/3_collapsed.png` });

	await card.getByRole('button', { name: EXPAND }).click();
	await page.waitForTimeout(600);
	await page.screenshot({ path: `${SHOT_DIR}/4_expanded_again.png` });

	await card.getByRole('button', { name: REMOVE }).click();
	await page.waitForTimeout(400);
	await page.screenshot({ path: `${SHOT_DIR}/5_removed.png` });

	await app.close();
	console.log('done');
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
