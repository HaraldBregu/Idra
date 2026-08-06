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

/**
 * Every navigable top-level route. The app uses a hash router, so we can drive
 * navigation deterministically regardless of onboarding/IPC state. A route that
 * fails to import or throws on mount is caught by the route ErrorBoundary, which
 * renders "This page crashed" — so its absence is the smoke signal.
 */
const routes = [
	'/start',
	'/home',
	'/settings',
	'/settings/application',
	'/settings/system',
	'/settings/channels',
	'/settings/skills',
	'/settings/providers',
	'/settings/providers/keys',
	'/settings/providers/mcp',
	'/settings/providers/transcribe',
	'/settings/providers/voice',
	'/settings/providers/image',
	'/settings/providers/embedding',
	'/settings/providers/video',
	'/settings/providers/music',
	'/settings/search',
	'/settings/rag',
	'/settings/wiki',
	'/settings/tasks',
	'/settings/tasks/health',
	'/settings/assistant',
	'/settings/assistant/chathistory',
];

for (const route of routes) {
	test(`route ${route} mounts without crashing`, async () => {
		await page.evaluate((hash) => {
			window.location.hash = `#${hash}`;
		}, route);
		// Let the lazy chunk load and the component mount.
		await page.waitForTimeout(500);
		await expect(page.locator('#root')).not.toBeEmpty();
		await expect(page.getByText('This page crashed')).toHaveCount(0);
	});
}

test('wiki settings renders the complete configuration workflow', async ({}, testInfo) => {
	await page.evaluate(() => {
		window.location.hash = '#/settings/wiki';
	});
	await expect(page.getByRole('heading', { name: 'Wiki', exact: true })).toBeVisible();
	await expect(page.getByRole('textbox', { name: 'Raw source folder', exact: true })).toBeVisible();
	await expect(
		page.getByRole('textbox', { name: 'Generated wiki folder', exact: true })
	).toBeVisible();
	await expect(page.getByRole('textbox', { name: 'Cron expression', exact: true })).toHaveValue(
		'0 3 * * *'
	);
	await expect(page.getByRole('button', { name: 'Run now' })).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath('wiki-settings.png'), fullPage: true });
	await page.getByText('Settings file', { exact: true }).scrollIntoViewIfNeeded();
	await expect(page.getByRole('switch', { name: 'Scheduled generation' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Open folder' })).toBeVisible();
	await page.screenshot({ path: testInfo.outputPath('wiki-settings-status.png'), fullPage: true });
});
