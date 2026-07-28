import { _electron } from 'playwright-core';

const app = await _electron.launch({
	executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
	args: ['./out/main/index.js'],
});
console.log('TCC screen:', await app.evaluate(({ systemPreferences }) => systemPreferences.getMediaAccessStatus('screen')));
console.log('sources:', await app.evaluate(({ desktopCapturer }) =>
	desktopCapturer.getSources({ types: ['screen'] }).then((s) => s.map((x) => x.name)).catch((e) => 'ERR ' + e.message)
));

const win = await app.firstWindow();
await win.waitForLoadState('domcontentloaded');
await new Promise((r) => setTimeout(r, 3000));

console.log(
	JSON.stringify(
		await win.evaluate(async () => {
			const out = {};
			for (const [name, c] of [
				['videoOnly', { video: true }],
				['audioVideo', { audio: true, video: true }],
			]) {
				try {
					const s = await navigator.mediaDevices.getDisplayMedia(c);
					out[name] = s.getTracks().map((t) => `${t.kind}:${t.label}`).join(' + ');
					s.getTracks().forEach((t) => t.stop());
				} catch (e) {
					out[name] = `${e.name}: ${e.message}`;
				}
			}
			return out;
		}),
		null,
		2
	)
);
await app.close();
process.exit(0);
