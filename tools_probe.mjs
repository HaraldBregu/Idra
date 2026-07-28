import fs from 'node:fs';
import { _electron } from 'playwright-core';

const app = await _electron.launch({
	executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
	args: ['./out/main/index.js'],
});
const win = await app.firstWindow();
await win.waitForLoadState('domcontentloaded');
await new Promise((r) => setTimeout(r, 4000));

// microphone end-to-end, with a custom filename
const out = '/tmp/claude-501/named-clip.webm';
fs.rmSync(out, { force: true });
const mic = await win.evaluate(async (out) => {
	const started = await window.recorder.microphone.start({ url: out, duration: 2000 });
	await new Promise((r) => setTimeout(r, 7000));
	return (await window.recorder.microphone.list()).find((r) => r.id === started.id);
}, out);
const b = fs.existsSync(out) ? fs.readFileSync(out) : null;
console.log(
	'microphone:',
	mic?.status,
	mic?.mimeType,
	b ? `${b.length}B magic=${b.subarray(0, 4).toString('hex')}` : 'NO FILE'
);

// screen: confirm the track is wired and reports its real failure
const scr = await win.evaluate(async () => {
	const started = await window.recorder.screen.start({
		url: '/tmp/claude-501/screen-probe.webm',
		duration: 2000,
	});
	await new Promise((r) => setTimeout(r, 5000));
	return (await window.recorder.screen.list()).find((r) => r.id === started.id);
});
console.log('screen:', scr?.status, scr?.error ?? '');

await app.close();
process.exit(0);
