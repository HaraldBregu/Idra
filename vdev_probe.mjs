import { _electron } from 'playwright-core';

const app = await _electron.launch({
	executablePath: 'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron',
	args: ['./out/main/index.js'],
});
const win = await app.firstWindow();
await win.waitForLoadState('domcontentloaded');
await new Promise((r) => setTimeout(r, 4000));

console.log(
	JSON.stringify(
		await win.evaluate(async () => {
			const devices = (await navigator.mediaDevices.enumerateDevices()).map(
				(d) => `${d.kind}|${d.label || '(no label)'}`
			);
			const tries = {};
			for (const [name, c] of [
				['videoOnly', { video: true }],
				['audioVideo', { audio: true, video: true }],
			]) {
				try {
					const s = await navigator.mediaDevices.getUserMedia(c);
					tries[name] = s.getTracks().map((t) => t.kind).join('+');
					s.getTracks().forEach((t) => t.stop());
				} catch (e) {
					tries[name] = `${e.name}: ${e.message}`;
				}
			}
			return { devices, tries };
		}),
		null,
		2
	)
);
await app.close();
process.exit(0);
