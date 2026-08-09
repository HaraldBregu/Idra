export async function copyText(value: string): Promise<void> {
	const textarea = document.createElement('textarea');
	textarea.value = value;
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'fixed';
	textarea.style.opacity = '0';
	document.body.append(textarea);
	textarea.select();
	const copied = document.execCommand('copy');
	textarea.remove();
	if (copied) return;
	if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
	throw new Error('Clipboard access is unavailable.');
}
