export function downloadFile(name: string, content: BlobPart, type: string): void {
	const url = URL.createObjectURL(new Blob([content], { type }));
	const anchor = document.createElement('a');
	anchor.href = url;
	anchor.download = name;
	anchor.click();
	window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
