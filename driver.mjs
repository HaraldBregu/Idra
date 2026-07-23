import { _electron } from 'playwright-core';
import fs from 'node:fs';

const CONFIG = '/Users/haraldbregu/Library/Application Support/Friday/cloud/storage.json';
const readPaths = () => JSON.parse(fs.readFileSync(CONFIG, 'utf8')).storages[0].paths;

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
await win.screenshot({ path: '/tmp/storage1.png' });

const text = await win.evaluate(() => document.body.innerText);
const switches = win.getByRole('switch');
console.log('switch count:', await switches.count());
console.log('has library path:', text.includes('agent/library'));
console.log('has notes path:', text.includes('agent/notes'));
console.log('paths before:', readPaths());

await switches.first().click();
await win.waitForTimeout(1200);
console.log('paths after ON:', readPaths());
await win.screenshot({ path: '/tmp/storage2.png' });

await switches.first().click();
await win.waitForTimeout(1200);
console.log('paths after OFF:', readPaths());
await win.screenshot({ path: '/tmp/storage3.png' });

await app.close();
console.log('DONE');
