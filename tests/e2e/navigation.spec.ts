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
	'/settings/mcp',
	'/settings/skills',
	'/settings/providers',
	'/settings/search',
	'/settings/tasks',
	'/settings/tasks/health',
	'/settings/assistant',
	'/settings/assistant/chathistory',
	'/settings/transcribe',
	'/settings/voice',
	'/settings/image',
	'/settings/video',
	'/settings/music',
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
