import { expect, test, type ElectronApplication, type Page } from '@playwright/test';
import { launchApp } from './helpers';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
	({ app, page } = await launchApp());
});

test.afterAll(async () => {
	await app?.close();
});

test('opens a window and renders the React app', async () => {
	await expect(page).toHaveTitle('Idra');
	await page.waitForSelector('#root');
	await expect(page.locator('#root')).not.toBeEmpty();
});
