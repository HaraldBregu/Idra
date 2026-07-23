import { _electron } from 'playwright-core';

const app = await _electron.launch({
	executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
	args: ['.'],
});
const win = await app.firstWindow();
await win.waitForLoadState('domcontentloaded');
await win.waitForTimeout(2500);
await win.evaluate(() => {
	window.location.hash = '#/settings/storage';
});
await win.waitForTimeout(2000);
await win.getByRole('switch').last().scrollIntoViewIfNeeded();
await win.waitForTimeout(500);
await win.screenshot({ path: '/tmp/storage_folders.png' });
await app.close();
console.log('DONE');
