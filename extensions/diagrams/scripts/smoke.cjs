const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');

const errors = [];

function wait(duration) {
	return new Promise((resolve) => setTimeout(resolve, duration));
}

async function waitFor(window, expression, timeout = 15000) {
	const started = Date.now();
	while (Date.now() - started < timeout) {
		if (await window.webContents.executeJavaScript(expression)) return;
		await wait(100);
	}
	throw new Error(`Timed out waiting for: ${expression}`);
}

async function run() {
	await session.defaultSession.clearStorageData();
	const window = new BrowserWindow({
		show: false,
		width: 1100,
		height: 760,
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: true,
		},
	});
	window.webContents.on('console-message', (_event, details) => {
		if (details.level === 'error') errors.push(details.message);
	});
	window.webContents.on('did-fail-load', (_event, code, description, url) => {
		if (code !== -3) errors.push(`${code} ${description} ${url}`);
	});
	session.defaultSession.webRequest.onErrorOccurred((details) => {
		if (details.url.startsWith('file:')) errors.push(`${details.error} ${details.url}`);
	});
	await window.loadFile(path.resolve(__dirname, '../dist/index.html'));
	await waitFor(window, "Boolean(document.querySelector('.diagram-output svg'))");
	const initial = await window.webContents.executeJavaScript(`({
		title: document.title,
		renderers: document.querySelector('.renderer-count')?.textContent,
		status: document.querySelector('.status-bar')?.textContent,
		error: document.querySelector('.error-card')?.textContent ?? ''
	})`);
	if (initial.title !== 'Diagrams') throw new Error(`Unexpected title: ${initial.title}`);
	if (!/^\d+ registered renderers$/.test(initial.renderers ?? '')) throw new Error(`Renderer inventory unavailable: ${initial.renderers}`);
	if (initial.error) throw new Error(initial.error);
	const examples = await window.webContents.executeJavaScript("Array.from(document.querySelector('.app-bar select').options).slice(1).map((option) => option.textContent)");
	const rendered = [];
	for (let index = 0; index < examples.length; index += 1) {
		await window.webContents.executeJavaScript(`(() => {
			const select = document.querySelector('.app-bar select');
			select.value = ${JSON.stringify(String(index))};
			select.dispatchEvent(new Event('change', { bubbles: true }));
		})()`);
		await wait(500);
		await waitFor(window, "!document.querySelector('.rendering')");
		const result = await window.webContents.executeJavaScript(`({
			svg: Boolean(document.querySelector('.diagram-output svg')),
			error: document.querySelector('.error-card')?.textContent ?? '',
			type: Array.from(document.querySelectorAll('.status-bar span')).map((node) => node.textContent).find((value) => value && !['Diagram ready', 'Accessibility text missing', 'Saved', 'Saving…'].includes(value) && !value.endsWith('characters')) ?? ''
		})`);
		if (!result.svg || result.error) throw new Error(`${examples[index]} failed: ${result.error || 'missing SVG'}`);
		rendered.push({ name: examples[index], type: result.type });
	}
	await window.webContents.executeJavaScript(`(() => {
		const config = document.querySelectorAll('.tabs button')[1];
		config.click();
		const input = document.querySelector('[data-testid="diagram-config"]');
		const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
		setter.call(input, '{invalid');
		input.dispatchEvent(new Event('input', { bubbles: true }));
	})()`);
	await wait(500);
	await waitFor(window, "Boolean(document.querySelector('.error-card'))");
	await window.webContents.executeJavaScript(`(() => {
		const input = document.querySelector('[data-testid="diagram-config"]');
		const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
		setter.call(input, '{}');
		input.dispatchEvent(new Event('input', { bubbles: true }));
	})()`);
	await wait(500);
	await waitFor(window, "Boolean(document.querySelector('.diagram-output svg')) && !document.querySelector('.error-card')");
	await window.reload();
	await waitFor(window, "Boolean(document.querySelector('.diagram-output svg'))");
	const restoredConfig = await window.webContents.executeJavaScript(`(() => {
		document.querySelectorAll('.tabs button')[1].click();
		return document.querySelector('[data-testid="diagram-config"]')?.value;
	})()`);
	if (restoredConfig !== '{}') throw new Error('Persisted editor configuration was not restored.');
	if (errors.length) throw new Error(`Runtime errors:\n${errors.join('\n')}`);
	process.stdout.write(`${JSON.stringify({ initial, rendered, errors }, null, 2)}\n`);
	window.destroy();
}

app.whenReady().then(run).then(() => app.quit()).catch((error) => {
	process.stderr.write(`${error.stack ?? error}\n`);
	app.exit(1);
});
