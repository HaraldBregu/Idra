const { _electron: electron } = require('playwright');
const path = require('node:path');

async function main() {
	const MAIN_ENTRY = path.resolve(__dirname, 'out/main/index.js');

	const app = await electron.launch({
		args: [MAIN_ENTRY],
		env: { ...process.env, NODE_ENV: 'development', ELECTRON_RENDERER_URL: '' },
	});

	const userDataPath = await app.evaluate(({ app }) => app.getPath('userData'));
	const appName = await app.evaluate(({ app }) => app.getName());
	console.log('userData path:', userDataPath);
	console.log('app name:', appName);

	await app.close();
}

main().catch((err) => {
	console.error('SCRIPT ERROR', err);
	process.exit(1);
});
