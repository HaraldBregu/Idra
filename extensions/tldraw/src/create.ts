import type { Editor, TLUiOverrideHelpers } from 'tldraw';

export function createDocument(editor: Editor, helpers: TLUiOverrideHelpers): void {
	if (!window.confirm(helpers.msg('file-system.confirm-clear.description'))) return;

	const currentPageId = editor.getCurrentPageId();
	editor.selectNone();
	for (const page of editor.getPages()) {
		if (page.id !== currentPageId) editor.deletePage(page.id);
	}
	editor.deleteShapes([...editor.getCurrentPageShapeIds()]);
	editor.deleteAssets(editor.getAssets().map((asset) => asset.id));
	editor.renamePage(currentPageId, 'Page 1');
	editor.updateDocumentSettings({ name: '' });
	editor.setCamera({ x: 0, y: 0, z: 1 });
	editor.clearHistory();
}
