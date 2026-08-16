import { generateAccessKey } from './key.js';

const elements = Object.fromEntries(
	[
		'access-copy',
		'access-form',
		'access-input',
		'access-notice',
		'access-save',
		'access-subtitle',
		'generate-access',
		'generated-access',
		'generated-key',
	].map((id) => [id, document.getElementById(id)])
);

elements['generate-access'].addEventListener('click', async () => {
	const accessKey = generateAccessKey();
	elements['generated-key'].textContent = accessKey;
	elements['generated-access'].hidden = false;
	elements['access-notice'].textContent = 'Access key generated. Copy it, then paste it into the access field.';
	elements['access-notice'].dataset.kind = 'success';
	try {
		await navigator.clipboard.writeText(accessKey);
		elements['access-notice'].textContent = 'Access key copied. Paste it into the access field, then save.';
	} catch {}
	elements['access-input'].focus();
});

elements['access-copy'].addEventListener('click', async () => {
	try {
		await navigator.clipboard.writeText(elements['generated-key'].textContent);
		elements['access-notice'].textContent = 'Access key copied. Paste it into the access field, then save.';
		elements['access-notice'].dataset.kind = 'success';
	} catch {
		elements['access-notice'].textContent = 'Copy was blocked. Select the generated key and copy it manually.';
		elements['access-notice'].dataset.kind = 'error';
	}
});

elements['access-form'].addEventListener('submit', async (event) => {
	event.preventDefault();
	const accessKey = elements['access-input'].value;
	elements['access-save'].disabled = true;
	elements['access-save'].textContent = 'Saving…';
	try {
		const response = await fetch('/access/session', {
			method: 'POST',
			credentials: 'same-origin',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ accessKey }),
		});
		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.message ?? data.error ?? 'Access was rejected.');
		}
		elements['access-input'].value = '';
		elements['generated-key'].textContent = '';
		window.location.replace('/');
	} catch (error) {
		elements['access-notice'].textContent = error instanceof Error ? error.message : String(error);
		elements['access-notice'].dataset.kind = 'error';
		elements['access-save'].disabled = false;
		elements['access-save'].textContent = 'Save and continue';
	}
});

try {
	const response = await fetch('/access/status', { credentials: 'same-origin' });
	const status = await response.json();
	if (status.authenticated) window.location.replace('/');
	if (status.configured) {
		elements['generate-access'].hidden = true;
		elements['access-subtitle'].textContent = 'Enter your saved access key to continue.';
		elements['access-notice'].textContent = 'This app is protected. Your login remains active on this browser.';
	}
} catch {
	elements['access-notice'].textContent = 'The app is unavailable. Retry when the server is running.';
	elements['access-notice'].dataset.kind = 'error';
}
