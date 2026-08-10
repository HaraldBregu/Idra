import type { Editor } from 'tldraw';

export function createDocument(editor: Editor): void {
	if (!window.confirm('Create a new drawing? Unsaved changes will be removed.')) return;

	const currentPageId = editor.getCurrentPageId();
	editor.selectNone();
	for (const page of editor.getPages()) {
		if (page.id !== currentPageId) editor.deletePage(page.id);
	}
	editor.deleteShapes([...editor.getCurrentPageShapeIds()]);
	editor.deleteAssets(editor.getAssets().map((asset) => asset.id));
	editor.renamePage(currentPageId, 'Page 1');
	editor.setCamera({ x: 0, y: 0, z: 1 });
	editor.clearHistory();
}
