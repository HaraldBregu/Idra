import { parseTldrawJsonFile, type Editor } from 'tldraw';

export function openDocument(editor: Editor): void {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.tldr,application/vnd.tldraw+json,application/json';
	input.addEventListener('change', async () => {
		const file = input.files?.[0];
		if (!file) return;
		const result = parseTldrawJsonFile({ json: await file.text(), schema: editor.store.schema });
		if (!result.ok) {
			window.alert('This file could not be opened as a tldraw document.');
			return;
		}
		editor.loadSnapshot(result.value.getStoreSnapshot());
		editor.clearHistory();
		const bounds = editor.getCurrentPageBounds();
		if (bounds) editor.zoomToBounds(bounds, { immediate: true, targetZoom: 1 });
	});
	input.click();
}
