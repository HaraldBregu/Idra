const { app, BrowserWindow, session } = require('electron');
const fs = require('node:fs');
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

async function waitForValue(read, timeout = 15000) {
	const started = Date.now();
	while (Date.now() - started < timeout) {
		const value = read();
		if (value) return value;
		await wait(100);
	}
	throw new Error('Timed out waiting for a runtime value.');
}

async function run() {
	await session.defaultSession.clearStorageData();
	const downloads = [];
	session.defaultSession.on('will-download', (_event, item) => {
		const target = path.join(app.getPath('temp'), `friday-diagrams-smoke-${Date.now()}-${item.getFilename()}`);
		item.setSavePath(target);
		item.once('done', (_doneEvent, state) => downloads.push({ target, state }));
	});
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
	window.webContents.on('console-message', (event) => {
		if (event.level === 'error') errors.push(event.message);
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
		error: document.querySelector('.error-card')?.textContent ?? '',
		titleNode: Boolean(document.querySelector('.diagram-output svg title')),
		descriptionNode: Boolean(document.querySelector('.diagram-output svg desc')),
		ariaRole: document.querySelector('.diagram-output svg')?.getAttribute('aria-roledescription')
	})`);
	if (initial.title !== 'Diagrams') throw new Error(`Unexpected title: ${initial.title}`);
	if (!/^\d+ registered renderers$/.test(initial.renderers ?? '')) throw new Error(`Renderer inventory unavailable: ${initial.renderers}`);
	if (initial.error) throw new Error(initial.error);
	if (!initial.titleNode || !initial.descriptionNode || !initial.ariaRole) throw new Error('Accessible SVG metadata is missing.');
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
		const select = document.querySelector('.app-bar select');
		select.value = '0';
		select.dispatchEvent(new Event('change', { bubbles: true }));
	})()`);
	await wait(500);
	await waitFor(window, "!document.querySelector('.rendering') && !document.querySelector('.error-card')");
	const optionResults = {};
	for (const [name, index] of [['themes', 0], ['looks', 1], ['layouts', 2]]) {
		const values = await window.webContents.executeJavaScript(`Array.from(document.querySelectorAll('.options-bar select')[${index}].options).map((option) => option.value)`);
		optionResults[name] = [];
		for (const value of values) {
			await window.webContents.executeJavaScript(`(() => {
				const select = document.querySelectorAll('.options-bar select')[${index}];
				select.value = ${JSON.stringify(value)};
				select.dispatchEvent(new Event('change', { bubbles: true }));
			})()`);
			await wait(500);
			await waitFor(window, "!document.querySelector('.rendering')");
			const optionError = await window.webContents.executeJavaScript("document.querySelector('.error-card')?.textContent ?? ''");
			if (optionError) throw new Error(`${name} option ${value} failed: ${optionError}`);
			optionResults[name].push(value);
		}
	}
	await window.webContents.executeJavaScript("document.querySelector('.preview-actions button[aria-label=\"Zoom in\"]').click()");
	const zoomTransform = await window.webContents.executeJavaScript("document.querySelector('.diagram-output').style.transform");
	if (zoomTransform !== 'scale(1.1)') throw new Error(`Zoom control failed: ${zoomTransform}`);
	await window.webContents.executeJavaScript(`(() => {
		const button = Array.from(document.querySelectorAll('.preview-actions button')).find((node) => node.textContent === 'SVG');
		button.click();
	})()`);
	await waitForValue(() => downloads.length >= 1);
	await window.webContents.executeJavaScript(`(() => {
		const button = Array.from(document.querySelectorAll('.preview-actions button')).find((node) => node.textContent === 'PNG');
		button.click();
	})()`);
	await waitForValue(() => downloads.length >= 2);
	for (const download of downloads) {
		if (download.state !== 'completed' || fs.statSync(download.target).size < 100) throw new Error(`Export failed: ${JSON.stringify(download)}`);
	}
	await window.webContents.executeJavaScript(`(() => {
		window.__fridayDiagramsInjected = false;
		const input = document.querySelector('[data-testid="diagram-source"]');
		const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
		setter.call(input, 'flowchart LR\\nA["<img src=x onerror=window.__fridayDiagramsInjected=true>"] --> B');
		input.dispatchEvent(new Event('input', { bubbles: true }));
	})()`);
	await wait(500);
	await waitFor(window, "!document.querySelector('.rendering')");
	const secure = await window.webContents.executeJavaScript(`({
		injected: window.__fridayDiagramsInjected,
		image: Boolean(document.querySelector('.diagram-output img')),
		error: document.querySelector('.error-card')?.textContent ?? ''
	})`);
	if (secure.injected || secure.image || secure.error) throw new Error(`Strict security check failed: ${JSON.stringify(secure)}`);
	await window.webContents.executeJavaScript("document.querySelectorAll('.tabs button')[1].click()");
	await waitFor(window, "Boolean(document.querySelector('[data-testid=\"diagram-config\"]'))");
	await window.webContents.executeJavaScript(`(() => {
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
	await waitFor(window, "Array.from(document.querySelectorAll('.status-bar span')).some((node) => node.textContent === 'Saved')");
	await window.reload();
	await waitFor(window, "Boolean(document.querySelector('.diagram-output svg'))");
	await window.webContents.executeJavaScript("document.querySelectorAll('.tabs button')[1].click()");
	await waitFor(window, "Boolean(document.querySelector('[data-testid=\"diagram-config\"]'))");
	const restoredConfig = await window.webContents.executeJavaScript("document.querySelector('[data-testid=\"diagram-config\"]').value");
	if (restoredConfig !== '{}') throw new Error('Persisted editor configuration was not restored.');
	if (errors.length) throw new Error(`Runtime errors:\n${errors.join('\n')}`);
	for (const download of downloads) fs.rmSync(download.target, { force: true });
	process.stdout.write(`${JSON.stringify({ initial, rendered, options: optionResults, exports: downloads.map(({ target, state }) => ({ name: path.extname(target), state })), secure, errors }, null, 2)}\n`);
	window.destroy();
}

app.whenReady().then(run).then(() => app.quit()).catch((error) => {
	process.stderr.write(`${error.stack ?? error}\n`);
	app.exit(1);
});
