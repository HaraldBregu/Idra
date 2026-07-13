import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'node:path';

const MAIN_ENTRY = path.resolve(__dirname, '../../out/main/index.js');

/**
 * Launch the built Electron app and return the app handle plus its first window.
 * Requires a prior `yarn build` so that out/main, out/preload and out/renderer exist.
 */
export async function launchApp(): Promise<{ app: ElectronApplication; page: Page }> {
	const app = await electron.launch({
		args: [MAIN_ENTRY],
		// ponytail: force production renderer (loadFile) even if a dev URL leaked into env
		env: { ...process.env, NODE_ENV: 'production', ELECTRON_RENDERER_URL: '' },
	});
	const page = await app.firstWindow();
	await page.waitForLoadState('domcontentloaded');
	return { app, page };
}
