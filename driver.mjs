import { _electron } from 'playwright-core';

const app = await _electron.launch({
	executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
	args: ['./out/main/index.js'],
});
const win = await app.firstWindow();
await win.waitForLoadState('domcontentloaded');

process.stdin.setEncoding('utf8');
for await (const line of process.stdin) {
	const [cmd, ...rest] = line.trim().split(' ');
	const arg = rest.join(' ');
	try {
		if (cmd === 'eval') console.log(JSON.stringify(await win.evaluate(arg)));
		else if (cmd === 'click') { await win.click(arg); console.log('clicked'); }
		else if (cmd === 'ss') { await win.screenshot({ path: arg }); console.log('shot ' + arg); }
		else if (cmd === 'quit') break;
	} catch (err) {
		console.log('ERR ' + err.message);
	}
}
await app.close();
process.exit(0);
