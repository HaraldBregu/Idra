import { _electron } from 'playwright-core';
import readline from 'node:readline';

const app = await _electron.launch({
	executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
	args: ['out/main/index.js'],
});
const page = await app.firstWindow();
await page.waitForLoadState('domcontentloaded');
console.log('READY');

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', async (line) => {
	const [cmd, ...rest] = line.split(' ');
	const arg = rest.join(' ');
	try {
		if (cmd === 'goto') {
			await page.evaluate((hash) => {
				window.location.hash = hash;
			}, arg);
		} else if (cmd === 'click') {
			await page.click(arg, { timeout: 5000 });
		} else if (cmd === 'eval') {
			console.log(JSON.stringify(await page.evaluate(arg)));
		} else if (cmd === 'ss') {
			await page.screenshot({ path: arg });
		} else if (cmd === 'quit') {
			await app.close();
			process.exit(0);
		}
		console.log('OK ' + cmd);
	} catch (err) {
		console.log('ERR ' + String(err).slice(0, 300));
	}
});
