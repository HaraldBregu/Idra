import { StorageApi } from './api.js';
import { PersistenceMarker } from './marker.js';
import { runSuite } from './suite.js';

const elements = Object.fromEntries(
	[
		'activity-list',
		'admin-token',
		'clear-log',
		'connect-button',
		'connection-form',
		'connection-status',
		'copy-log',
		'data-directory',
		'delete-file',
		'delete-settings',
		'disconnect-button',
		'file-content',
		'file-count',
		'file-list',
		'file-path',
		'load-settings',
		'notice',
		'persistence-clean',
		'persistence-prepare',
		'persistence-result',
		'persistence-verify',
		'read-file',
		'refresh-all',
		'refresh-files',
		'run-suite',
		'save-file',
		'save-settings',
		'settings-json',
		'settings-state',
		'show-token',
		'suite-result',
	].map((id) => [id, document.getElementById(id)])
);

const requiresToken = [...document.querySelectorAll('[data-requires-token]')];
const api = new StorageApi(logResult);
const marker = new PersistenceMarker(api);
let connected = false;

function format(value) {
	return JSON.stringify(value, null, 2);
}

function announce(message, kind = 'info') {
	elements.notice.textContent = message;
	elements.notice.dataset.kind = kind;
}

function logResult(result) {
	const item = document.createElement('li');
	item.className = 'activity-item';
	item.dataset.ok = result.status >= 200 && result.status < 300 ? 'true' : 'false';
	const summary = document.createElement('div');
	summary.className = 'activity-summary';
	const request = document.createElement('strong');
	request.textContent = `${result.method} ${result.endpoint}`;
	const status = document.createElement('span');
	status.textContent = result.status
		? `${result.status} · ${result.duration} ms`
		: `Network error · ${result.duration} ms`;
	summary.append(request, status);
	const details = document.createElement('pre');
	details.textContent = format(result.data);
	item.append(summary, details);
	elements['activity-list'].prepend(item);
}

function setConnected(value, label) {
	connected = value;
	elements['connection-status'].textContent = label;
	elements['connection-status'].dataset.connected = String(value);
	for (const control of requiresToken) control.disabled = !value;
	elements['disconnect-button'].disabled = !value;
}

function setBusy(button, busy, busyLabel) {
	if (busy) {
		button.dataset.label = button.textContent;
		button.textContent = busyLabel;
	} else if (button.dataset.label) {
		button.textContent = button.dataset.label;
		delete button.dataset.label;
	}
	button.disabled = busy || (!connected && button.hasAttribute('data-requires-token'));
	button.setAttribute('aria-busy', String(busy));
}

function renderFiles(files) {
	elements['file-list'].replaceChildren();
	if (files.length === 0) {
		const row = document.createElement('tr');
		const cell = document.createElement('td');
		cell.colSpan = 3;
		cell.className = 'empty-cell';
		cell.textContent = 'No files stored in /data/files.';
		row.append(cell);
		elements['file-list'].append(row);
		return;
	}
	for (const file of files) {
		const row = document.createElement('tr');
		const pathCell = document.createElement('td');
		pathCell.textContent = file.path;
		const sizeCell = document.createElement('td');
		sizeCell.textContent = `${file.size} B`;
		const actionCell = document.createElement('td');
		const loadButton = document.createElement('button');
		loadButton.type = 'button';
		loadButton.className = 'button button-quiet button-small';
		loadButton.textContent = 'Load';
		loadButton.dataset.filePath = file.path;
		loadButton.setAttribute('aria-label', `Load ${file.path}`);
		actionCell.append(loadButton);
		row.append(pathCell, sizeCell, actionCell);
		elements['file-list'].append(row);
	}
}

async function loadSettings(updateEditor = true) {
	const result = await api.request('/settings');
	elements['settings-state'].textContent = result.exists ? 'Stored on volume' : 'Not created';
	elements['settings-state'].dataset.exists = String(result.exists);
	if (updateEditor) elements['settings-json'].value = format(result.settings);
	return result;
}

async function loadFiles() {
	const result = await api.request('/files');
	renderFiles(result.files);
	elements['file-count'].textContent = String(result.files.length);
	return result;
}

async function refreshAll(updateEditor = true) {
	const [storage] = await Promise.all([
		api.request('/storage'),
		loadSettings(updateEditor),
		loadFiles(),
	]);
	elements['data-directory'].textContent = storage.dataDirectory;
	elements['file-count'].textContent = String(storage.files.count);
	return storage;
}

function handleError(error) {
	const message = error instanceof Error ? error.message : String(error);
	if (error?.status === 401) {
		setConnected(false, 'Authentication failed');
		announce('The admin token was rejected. Check IDRA_ADMIN_TOKEN and try again.', 'error');
	} else if (error?.status === 404) {
		announce('The storage API is disabled. Set IDRA_ADMIN_TOKEN and restart the server.', 'error');
	} else if (error?.status === 0 || error instanceof TypeError) {
		announce('The server is offline or restarting. Reconnect when it is available.', 'error');
	} else {
		announce(message, 'error');
	}
}

elements['connection-form'].addEventListener('submit', async (event) => {
	event.preventDefault();
	const token = elements['admin-token'].value;
	if (!token) {
		announce('Enter the admin token first.', 'error');
		return;
	}
	api.setToken(token);
	setBusy(elements['connect-button'], true, 'Connecting…');
	try {
		await refreshAll();
		setConnected(true, 'Connected');
		announce('Connected. Storage data is ready to inspect.', 'success');
	} catch (error) {
		handleError(error);
	} finally {
		setBusy(elements['connect-button'], false, 'Connect');
	}
});

elements['show-token'].addEventListener('change', () => {
	elements['admin-token'].type = elements['show-token'].checked ? 'text' : 'password';
});

elements['disconnect-button'].addEventListener('click', () => {
	api.setToken('');
	elements['admin-token'].value = '';
	elements['show-token'].checked = false;
	elements['admin-token'].type = 'password';
	setConnected(false, 'Not connected');
	announce('Disconnected. The token was cleared from this page.', 'info');
});

elements['refresh-all'].addEventListener('click', async () => {
	setBusy(elements['refresh-all'], true, 'Refreshing…');
	try {
		await refreshAll();
		announce('Storage overview refreshed.', 'success');
	} catch (error) {
		handleError(error);
	} finally {
		setBusy(elements['refresh-all'], false, 'Refresh all');
	}
});

elements['load-settings'].addEventListener('click', async () => {
	try {
		await loadSettings();
		announce('Settings loaded from the volume.', 'success');
	} catch (error) {
		handleError(error);
	}
});

elements['save-settings'].addEventListener('click', async () => {
	try {
		const settings = JSON.parse(elements['settings-json'].value);
		if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
			throw new Error('Settings must be a JSON object.');
		}
		await api.request('/settings', { method: 'PUT', body: { settings } });
		await refreshAll(false);
		announce('Settings saved to the volume.', 'success');
	} catch (error) {
		handleError(error);
	}
});

elements['delete-settings'].addEventListener('click', async () => {
	if (!window.confirm('Delete settings.json from the persistent volume?')) return;
	try {
		await api.request('/settings', { method: 'DELETE' });
		await refreshAll();
		announce('settings.json was deleted.', 'success');
	} catch (error) {
		handleError(error);
	}
});

elements['save-file'].addEventListener('click', async () => {
	try {
		const path = elements['file-path'].value;
		await api.request('/files', {
			method: 'PUT',
			body: { path, content: elements['file-content'].value },
		});
		await loadFiles();
		announce(`${path} saved to the volume.`, 'success');
	} catch (error) {
		handleError(error);
	}
});

elements['read-file'].addEventListener('click', async () => {
	try {
		const path = elements['file-path'].value;
		const result = await api.request(`/files?${new URLSearchParams({ path })}`);
		elements['file-content'].value = result.file.content;
		announce(`${path} loaded.`, 'success');
	} catch (error) {
		handleError(error);
	}
});

elements['delete-file'].addEventListener('click', async () => {
	const path = elements['file-path'].value;
	if (!window.confirm(`Delete ${path} from the persistent volume?`)) return;
	try {
		await api.request(`/files?${new URLSearchParams({ path })}`, { method: 'DELETE' });
		await loadFiles();
		announce(`${path} deleted.`, 'success');
	} catch (error) {
		handleError(error);
	}
});

elements['refresh-files'].addEventListener('click', async () => {
	try {
		await loadFiles();
		announce('File list refreshed.', 'success');
	} catch (error) {
		handleError(error);
	}
});

elements['file-list'].addEventListener('click', async (event) => {
	const button = event.target.closest('[data-file-path]');
	if (!button) return;
	elements['file-path'].value = button.dataset.filePath;
	elements['read-file'].click();
});

elements['run-suite'].addEventListener('click', async () => {
	setBusy(elements['run-suite'], true, 'Running suite…');
	const hooks = {
		reset() {
			for (const step of document.querySelectorAll('[data-suite-step]'))
				step.dataset.state = 'pending';
			elements['suite-result'].textContent = 'Running safe storage checks…';
			elements['suite-result'].dataset.kind = 'info';
		},
		step(name, state) {
			document.querySelector(`[data-suite-step="${name}"]`).dataset.state = state;
		},
		result(state, message) {
			elements['suite-result'].textContent = message;
			elements['suite-result'].dataset.kind = state === 'passed' ? 'success' : 'error';
		},
	};
	try {
		await runSuite(api, hooks);
		await refreshAll();
	} catch (error) {
		handleError(error);
	} finally {
		setBusy(elements['run-suite'], false, 'Run full API suite');
	}
});

elements['persistence-prepare'].addEventListener('click', async () => {
	try {
		const result = await marker.prepare();
		elements['persistence-result'].textContent =
			`Marker ${result.id} is ready. Recreate the container, reconnect, then verify.`;
		elements['persistence-result'].dataset.kind = 'success';
		await refreshAll();
	} catch (error) {
		handleError(error);
	}
});

elements['persistence-verify'].addEventListener('click', async () => {
	try {
		const result = await marker.verify();
		elements['persistence-result'].textContent =
			`Persistence verified. Settings and ${result.filePath} contain marker ${result.id}.`;
		elements['persistence-result'].dataset.kind = 'success';
	} catch (error) {
		elements['persistence-result'].textContent =
			error instanceof Error ? error.message : String(error);
		elements['persistence-result'].dataset.kind = 'error';
		handleError(error);
	}
});

elements['persistence-clean'].addEventListener('click', async () => {
	try {
		const result = await marker.cleanup();
		elements['persistence-result'].textContent = `Marker ${result.id} was removed safely.`;
		elements['persistence-result'].dataset.kind = 'success';
		await refreshAll();
	} catch (error) {
		handleError(error);
	}
});

elements['clear-log'].addEventListener('click', () => {
	elements['activity-list'].replaceChildren();
	announce('Activity log cleared.', 'info');
});

elements['copy-log'].addEventListener('click', async () => {
	try {
		await navigator.clipboard.writeText(elements['activity-list'].innerText);
		announce('Activity log copied.', 'success');
	} catch {
		announce('The browser could not copy the activity log.', 'error');
	}
});

for (const editor of [elements['settings-json'], elements['file-content']]) {
	editor.addEventListener('keydown', (event) => {
		if (!(event.ctrlKey || event.metaKey) || event.key !== 'Enter') return;
		event.preventDefault();
		(editor === elements['settings-json']
			? elements['save-settings']
			: elements['save-file']
		).click();
	});
}

setConnected(false, 'Not connected');
elements['settings-json'].value = '{}';
elements['file-content'].value = 'Hello from the storage test console.';
