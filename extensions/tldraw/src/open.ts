import {
	parseTldrawJsonFile,
	type Editor,
	type TLUiOverrideHelpers,
} from 'tldraw';
import { openError } from './openerror';

export function openDocument(editor: Editor, helpers: TLUiOverrideHelpers): void {
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.tldr,application/vnd.tldraw+json,application/json';
	input.addEventListener('change', async () => {
		const file = input.files?.[0];
		if (!file) return;
		if (!window.confirm(helpers.msg('file-system.confirm-open.description'))) return;
		try {
			const result = parseTldrawJsonFile({ json: await file.text(), schema: editor.store.schema });
			if (!result.ok) {
				helpers.addToast({
					title: helpers.msg('file-system.file-open-error.title'),
					description: openError(result.error, helpers),
					severity: 'error',
				});
				return;
			}
			editor.loadSnapshot(result.value.getStoreSnapshot());
			editor.clearHistory();
			const bounds = editor.getCurrentPageBounds();
			if (bounds) editor.zoomToBounds(bounds, { immediate: true, targetZoom: 1 });
		} catch {
			helpers.addToast({
				title: helpers.msg('file-system.file-open-error.title'),
				description: helpers.msg('file-system.file-open-error.generic-corrupted-file'),
				severity: 'error',
			});
		}
	});
	input.click();
}
