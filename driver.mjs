import { _electron } from 'playwright-core';
import readline from 'node:readline';

const app = await _electron.launch({
	executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
	args: ['.'],
});
const page = await app.firstWindow();
await page.waitForLoadState('domcontentloaded');
console.log('READY');

const rl = readline.createInterface({ input: process.stdin });
for await (const line of rl) {
	const [cmd, ...rest] = line.trim().split(' ');
	const arg = rest.join(' ');
	try {
		if (cmd === 'goto') {
			await page.evaluate((hash) => {
				window.location.hash = hash;
			}, arg);
			await page.waitForTimeout(600);
			console.log('OK goto', arg);
		} else if (cmd === 'text') {
			console.log(await page.locator('main').innerText());
		} else if (cmd === 'eval') {
			console.log(JSON.stringify(await page.evaluate(arg)));
		} else if (cmd === 'click') {
			await page.click(arg);
			await page.waitForTimeout(400);
			console.log('OK click', arg);
		} else if (cmd === 'ss') {
			await page.screenshot({ path: arg });
			console.log('OK ss', arg);
		} else if (cmd === 'quit') {
			break;
		}
	} catch (error) {
		console.log('ERR', error.message);
	}
}
await app.close();
process.exit(0);
