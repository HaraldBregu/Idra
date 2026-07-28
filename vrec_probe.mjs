import { _electron } from 'playwright-core';

const app = await _electron.launch({
	executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
	args: ['./out/main/index.js'],
});
const win = await app.firstWindow();
await win.waitForLoadState('domcontentloaded');
await new Promise((r) => setTimeout(r, 4000));

// 1. renderer-side capability probe
const probe = await win.evaluate(async () => {
	const out = { href: location.href, hasRecorder: !!window.recorder, secure: window.isSecureContext };
	try {
		const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
		out.gum = 'ok';
		out.tracks = s.getTracks().map((t) => `${t.kind}:${t.label}:${t.readyState}`);
		out.mimeSupport = {
			default: MediaRecorder.isTypeSupported('video/webm'),
			vp8: MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus'),
		};
		const rec = new MediaRecorder(s);
		out.recorderMime = rec.mimeType;
		s.getTracks().forEach((t) => t.stop());
	} catch (e) {
		out.gum = `FAIL ${e.name}: ${e.message}`;
	}
	return out;
});
console.log('PROBE', JSON.stringify(probe, null, 2));

// 2. full path through main-process recorder
const start = await app.evaluate(async ({}, dir) => {
	const { videoRecorder } = require('./out/main/index.js').__test ?? {};
	return 'noexport';
}, process.cwd()).catch((e) => 'evalfail: ' + e.message);
console.log('MAINEVAL', start);

// 2b. drive via renderer IPC (same path the tool uses in main, minus tool wrapper)
const rec = await win.evaluate(async () => {
	const events = [];
	window.recorder.video.onEvent((e) => events.push({ ...e }));
	const started = await window.recorder.video.start({
		url: '/tmp/claude-501/vrec-probe.webm',
		duration: 3000,
	});
	await new Promise((r) => setTimeout(r, 9000));
	const list = await window.recorder.video.list();
	return { started, events, list };
});
console.log('RECORD', JSON.stringify(rec, null, 2));

await app.close();
process.exit(0);
