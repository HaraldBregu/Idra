import fs from 'node:fs';
import { _electron } from 'playwright-core';

const app = await _electron.launch({
	executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
	args: ['./out/main/index.js'],
});
const win = await app.firstWindow();
await win.waitForLoadState('domcontentloaded');
await new Promise((r) => setTimeout(r, 4000));

for (const track of ['microphone', 'camera', 'screen']) {
	const out = `/tmp/claude-501/probe-${track}.webm`;
	fs.rmSync(out, { force: true });
	const res = await win.evaluate(
		async ([track, out]) => {
			const started = await window.recorder[track].start({ url: out, duration: 2500 });
			await new Promise((r) => setTimeout(r, 8000));
			return (await window.recorder[track].list()).find((r) => r.id === started.id);
		},
		[track, out]
	);
	let verdict = 'NO FILE';
	if (fs.existsSync(out)) {
		const b = fs.readFileSync(out);
		const magic = b.subarray(0, 4).toString('hex');
		const codecs = ['V_VP8', 'V_VP9', 'A_OPUS'].filter((c) => b.toString('latin1').includes(c));
		verdict = `${b.length}B magic=${magic}${magic === '1a45dfa3' ? ' (valid EBML)' : ' (CORRUPT)'} codecs=[${codecs}]`;
	}
	console.log(`${track}: status=${res?.status} ${res?.error ?? ''} mime=${res?.mimeType} -> ${verdict}`);
}

await app.close();
process.exit(0);
