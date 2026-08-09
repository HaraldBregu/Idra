const { app, BrowserWindow, clipboard, nativeImage, session } = require('electron');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const errors = [];

function wait(duration) {
	return new Promise((resolve) => setTimeout(resolve, duration));
}

function signature(value) {
	return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

async function waitFor(window, expression, timeout = 15000) {
	const started = Date.now();
	while (Date.now() - started < timeout) {
		if (await window.webContents.executeJavaScript(expression)) return;
		await wait(100);
	}
	throw new Error(`Timed out waiting for: ${expression}`);
}

async function waitForDownload(window, downloads, count) {
	const started = Date.now();
	while (Date.now() - started < 15000) {
		if (downloads.length >= count) return;
		const exportError = await window.webContents.executeJavaScript(
			"document.querySelector('.error-card')?.textContent ?? ''"
		);
		if (exportError) throw new Error(`Export failed: ${exportError}`);
		await wait(100);
	}
	throw new Error(`Timed out waiting for download ${count}.`);
}

async function run() {
	await session.defaultSession.clearStorageData();
	const downloads = [];
	session.defaultSession.on('will-download', (_event, item) => {
		const target = path.join(
			app.getPath('temp'),
			`friday-diagrams-smoke-${Date.now()}-${item.getFilename()}`
		);
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
	if (!/^\d+ registered renderers$/.test(initial.renderers ?? ''))
		throw new Error(`Renderer inventory unavailable: ${initial.renderers}`);
	if (initial.error) throw new Error(initial.error);
	if (!initial.titleNode || !initial.descriptionNode || !initial.ariaRole)
		throw new Error('Accessible SVG metadata is missing.');
	const examples = await window.webContents.executeJavaScript(
		"Array.from(document.querySelector('.app-bar select').options).slice(1).map((option) => option.textContent)"
	);
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
		if (!result.svg || result.error)
			throw new Error(`${examples[index]} failed: ${result.error || 'missing SVG'}`);
		rendered.push({ name: examples[index], type: result.type });
	}
	await window.webContents.executeJavaScript(`(() => {
		const select = document.querySelector('.app-bar select');
		select.value = '0';
		select.dispatchEvent(new Event('change', { bubbles: true }));
	})()`);
	await wait(500);
	await waitFor(
		window,
		"!document.querySelector('.rendering') && !document.querySelector('.error-card')"
	);
	const optionResults = {};
	for (const [name, index] of [
		['themes', 0],
		['looks', 1],
		['layouts', 2],
	]) {
		const values = await window.webContents.executeJavaScript(
			`Array.from(document.querySelectorAll('.options-bar select')[${index}].options).map((option) => option.value)`
		);
		optionResults[name] = [];
		for (const value of values) {
			if (name === 'layouts') {
				const example = ['cose-bilkent', 'tidy-tree'].includes(value) ? 'Mindmap' : 'Flowchart';
				await window.webContents.executeJavaScript(`(() => {
					const select = document.querySelector('.app-bar select');
					const option = Array.from(select.options).find((entry) => entry.textContent === ${JSON.stringify(example)});
					select.value = option.value;
					select.dispatchEvent(new Event('change', { bubbles: true }));
				})()`);
			}
			await window.webContents.executeJavaScript(`(() => {
				const select = document.querySelectorAll('.options-bar select')[${index}];
				select.value = ${JSON.stringify(value)};
				select.dispatchEvent(new Event('change', { bubbles: true }));
			})()`);
			await wait(500);
			await waitFor(window, "!document.querySelector('.rendering')");
			const optionError = await window.webContents.executeJavaScript(
				"document.querySelector('.error-card')?.textContent ?? ''"
			);
			if (optionError) throw new Error(`${name} option ${value} failed: ${optionError}`);
			const markup = await window.webContents.executeJavaScript(
				"document.querySelector('.diagram-output svg')?.outerHTML ?? ''"
			);
			optionResults[name].push({ value, signature: signature(markup) });
		}
	}
	const optionSignatures = Object.fromEntries(
		Object.entries(optionResults).map(([name, values]) => [
			name,
			Object.fromEntries(values.map(({ value, signature: hash }) => [value, hash])),
		])
	);
	if (optionSignatures.themes.default === optionSignatures.themes.dark)
		throw new Error('Default and dark themes produced identical SVG output.');
	if (optionSignatures.looks.classic === optionSignatures.looks.handDrawn)
		throw new Error('Classic and hand-drawn looks produced identical SVG output.');
	if (optionSignatures.layouts.dagre === optionSignatures.layouts.elk)
		throw new Error('Dagre and ELK produced identical SVG output.');
	if (optionSignatures.layouts['cose-bilkent'] === optionSignatures.layouts['tidy-tree'])
		throw new Error('Cose-bilkent and tidy-tree produced identical mindmap output.');
	await window.webContents.executeJavaScript(`(() => {
		const controls = document.querySelectorAll('.options-bar select');
		for (const [index, value] of [['0', 'default'], ['1', 'classic'], ['2', 'auto']]) {
			controls[Number(index)].value = value;
			controls[Number(index)].dispatchEvent(new Event('change', { bubbles: true }));
		}
		const select = document.querySelector('.app-bar select');
		const option = Array.from(select.options).find((entry) => entry.textContent === 'Math and Markdown');
		select.value = option.value;
		select.dispatchEvent(new Event('change', { bubbles: true }));
	})()`);
	await wait(500);
	await waitFor(
		window,
		"!document.querySelector('.rendering') && Boolean(document.querySelector('.diagram-output .katex'))"
	);
	const richLabels = await window.webContents.executeJavaScript(`({
		foreignObjects: document.querySelectorAll('.diagram-output foreignObject').length,
		katex: Boolean(document.querySelector('.diagram-output .katex')),
		strong: Boolean(document.querySelector('.diagram-output strong')),
		emphasis: Boolean(document.querySelector('.diagram-output em'))
	})`);
	if (!richLabels.foreignObjects || !richLabels.katex || !richLabels.strong || !richLabels.emphasis)
		throw new Error(`Rich Mermaid labels are incomplete: ${JSON.stringify(richLabels)}`);
	await window.webContents.executeJavaScript(`(() => {
		const button = Array.from(document.querySelectorAll('.preview-actions button')).find((node) => node.textContent === 'Fit');
		button.click();
	})()`);
	await wait(100);
	await window.webContents.executeJavaScript(
		'document.querySelector(\'.preview-actions button[aria-label="Zoom in"]\').click()'
	);
	const zoomTransform = await window.webContents.executeJavaScript(
		"document.querySelector('.diagram-output').style.transform"
	);
	if (zoomTransform !== 'scale(1.1)') throw new Error(`Zoom control failed: ${zoomTransform}`);
	await window.webContents.executeJavaScript(`(() => {
		const button = Array.from(document.querySelectorAll('.preview-actions button')).find((node) => node.textContent === 'SVG');
		button.click();
	})()`);
	await waitForDownload(window, downloads, 1);
	await window.webContents.executeJavaScript(`(() => {
		const button = Array.from(document.querySelectorAll('.preview-actions button')).find((node) => node.textContent === 'PNG');
		button.click();
	})()`);
	await waitForDownload(window, downloads, 2);
	for (const download of downloads) {
		if (download.state !== 'completed' || fs.statSync(download.target).size < 100)
			throw new Error(`Export failed: ${JSON.stringify(download)}`);
	}
	const svgDownload = downloads.find(({ target }) => path.extname(target) === '.svg');
	const pngDownload = downloads.find(({ target }) => path.extname(target) === '.png');
	const exportedSvg = fs.readFileSync(svgDownload.target, 'utf8');
	if (!exportedSvg.includes('<foreignObject') || !exportedSvg.includes('class="katex"'))
		throw new Error('SVG export lost Mermaid rich-label content.');
	const exportedPng = nativeImage.createFromPath(pngDownload.target);
	if (exportedPng.isEmpty() || exportedPng.getSize().width < 1 || exportedPng.getSize().height < 1)
		throw new Error('PNG export is not a decodable image.');
	const printed = await window.webContents.printToPDF({ printBackground: true });
	if (printed.length < 1000) throw new Error('Print layout did not produce a PDF.');
	const copyPoint = await window.webContents.executeJavaScript(`(() => {
		const button = Array.from(document.querySelectorAll('.preview-actions button')).find((node) => node.textContent === 'Copy SVG');
		const bounds = button.getBoundingClientRect();
		return { x: Math.round(bounds.left + bounds.width / 2), y: Math.round(bounds.top + bounds.height / 2) };
	})()`);
	window.show();
	window.focus();
	window.webContents.sendInputEvent({
		type: 'mouseDown',
		...copyPoint,
		button: 'left',
		clickCount: 1,
	});
	window.webContents.sendInputEvent({
		type: 'mouseUp',
		...copyPoint,
		button: 'left',
		clickCount: 1,
	});
	await wait(200);
	window.hide();
	if (!clipboard.readText().includes('<svg')) {
		const copyError = await window.webContents.executeJavaScript(
			"document.querySelector('.error-card')?.textContent ?? ''"
		);
		throw new Error(`Copy SVG did not write SVG markup: ${copyError || 'clipboard stayed empty'}`);
	}
	await window.webContents.executeJavaScript(`(() => {
		window.__fridayDiagramsInjected = false;
		const input = document.querySelector('[data-testid="diagram-source"]');
		const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
		setter.call(input, 'flowchart LR\\nA["<img src=data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw== onload=window.__fridayDiagramsInjected=true>"] --> B');
		input.dispatchEvent(new Event('input', { bubbles: true }));
	})()`);
	await wait(500);
	await waitFor(window, "!document.querySelector('.rendering')");
	const secure = await window.webContents.executeJavaScript(`({
		injected: window.__fridayDiagramsInjected,
		dangerousAttribute: Boolean(document.querySelector('.diagram-output [onerror], .diagram-output [onload]')),
		error: document.querySelector('.error-card')?.textContent ?? ''
	})`);
	if (secure.injected || secure.dangerousAttribute || secure.error)
		throw new Error(`Strict security check failed: ${JSON.stringify(secure)}`);
	await window.webContents.executeJavaScript(`(() => {
		const input = document.querySelector('.file-button input');
		const file = new File(['# Notes\\n\\n\`\`\`mermaid\\nsequenceDiagram\\n  Alice->>Bob: Imported\\n\`\`\`'], 'diagram.md', { type: 'text/markdown' });
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		input.dispatchEvent(new Event('change', { bubbles: true }));
	})()`);
	await waitFor(
		window,
		"!document.querySelector('.rendering') && document.querySelector('[data-testid=\"diagram-source\"]').value.startsWith('sequenceDiagram') && Array.from(document.querySelectorAll('.status-bar span')).some((node) => node.textContent === 'sequence')"
	);
	const imported = await window.webContents.executeJavaScript(`({
		source: document.querySelector('[data-testid="diagram-source"]').value,
		type: Array.from(document.querySelectorAll('.status-bar span')).map((node) => node.textContent).find((value) => value === 'sequence') ?? '',
		error: document.querySelector('.error-card')?.textContent ?? ''
	})`);
	if (
		imported.source.includes('```') ||
		!imported.source.startsWith('sequenceDiagram') ||
		imported.type !== 'sequence' ||
		imported.error
	)
		throw new Error(`Markdown import failed: ${JSON.stringify(imported)}`);
	await window.webContents.executeJavaScript(`(() => {
		const input = document.querySelector('[data-testid="diagram-source"]');
		const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
		setter.call(input, 'flowchart LR\\nOld --> Render');
		input.dispatchEvent(new Event('input', { bubbles: true }));
		setter.call(input, 'pie title Latest render\\n"Current" : 100');
		input.dispatchEvent(new Event('input', { bubbles: true }));
	})()`);
	await waitFor(
		window,
		"!document.querySelector('.rendering') && document.querySelector('[data-testid=\"diagram-source\"]').value.startsWith('pie') && Array.from(document.querySelectorAll('.status-bar span')).some((node) => node.textContent === 'pie')"
	);
	const latestRender = await window.webContents.executeJavaScript(`({
		source: document.querySelector('[data-testid="diagram-source"]').value,
		type: Array.from(document.querySelectorAll('.status-bar span')).some((node) => node.textContent === 'pie'),
		error: document.querySelector('.error-card')?.textContent ?? ''
	})`);
	if (!latestRender.source.startsWith('pie') || !latestRender.type || latestRender.error)
		throw new Error(`Rapid-edit render ordering failed: ${JSON.stringify(latestRender)}`);
	await window.webContents.executeJavaScript(`(() => {
		document.querySelector('.live input').click();
		const input = document.querySelector('[data-testid="diagram-source"]');
		const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
		setter.call(input, 'stateDiagram-v2\\n[*] --> Manual');
		input.dispatchEvent(new Event('input', { bubbles: true }));
	})()`);
	await wait(700);
	const beforeManualRender = await window.webContents.executeJavaScript(
		"Array.from(document.querySelectorAll('.status-bar span')).some((node) => node.textContent === 'pie')"
	);
	if (!beforeManualRender)
		throw new Error('Disabling live render did not preserve the previous preview.');
	await window.webContents.executeJavaScript("document.querySelector('button.primary').click()");
	await waitFor(
		window,
		"!document.querySelector('.rendering') && Array.from(document.querySelectorAll('.status-bar span')).some((node) => node.textContent === 'stateDiagram')"
	);
	await window.webContents.executeJavaScript("document.querySelector('.live input').click()");
	await window.webContents.executeJavaScript(
		"document.querySelectorAll('.tabs button')[1].click()"
	);
	await waitFor(window, 'Boolean(document.querySelector(\'[data-testid="diagram-config"]\'))');
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
	await waitFor(
		window,
		"Boolean(document.querySelector('.diagram-output svg')) && !document.querySelector('.error-card')"
	);
	await waitFor(
		window,
		"Array.from(document.querySelectorAll('.status-bar span')).some((node) => node.textContent === 'Saved')"
	);
	await window.reload();
	await waitFor(window, "Boolean(document.querySelector('.diagram-output svg'))");
	await window.webContents.executeJavaScript(
		"document.querySelectorAll('.tabs button')[1].click()"
	);
	await waitFor(window, 'Boolean(document.querySelector(\'[data-testid="diagram-config"]\'))');
	const restoredConfig = await window.webContents.executeJavaScript(
		'document.querySelector(\'[data-testid="diagram-config"]\').value'
	);
	if (restoredConfig !== '{}') throw new Error('Persisted editor configuration was not restored.');
	if (errors.length) throw new Error(`Runtime errors:\n${errors.join('\n')}`);
	for (const download of downloads) fs.rmSync(download.target, { force: true });
	process.stdout.write(
		`${JSON.stringify({ initial, rendered, options: optionResults, exports: downloads.map(({ target, state }) => ({ name: path.extname(target), state })), secure, errors }, null, 2)}\n`
	);
	window.destroy();
}

app
	.whenReady()
	.then(run)
	.then(() => app.quit())
	.catch((error) => {
		process.stderr.write(`${error.stack ?? error}\n`);
		app.exit(1);
	});
