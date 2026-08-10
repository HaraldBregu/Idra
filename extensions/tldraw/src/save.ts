import { serializeTldrawJsonBlob, type Editor, type TLUiOverrideHelpers } from 'tldraw';

export async function saveDocument(
	editor: Editor,
	helpers: TLUiOverrideHelpers
): Promise<void> {
	try {
		const blob = await serializeTldrawJsonBlob(editor);
		const documentName = editor.getDocumentSettings().name.trim() || 'drawing';
		const fileName = `${documentName.replaceAll(/[^a-z0-9._-]+/gi, '-')}.tldr`;
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.href = url;
		link.download = fileName;
		link.click();
		URL.revokeObjectURL(url);
	} catch {
		helpers.addToast({ title: 'Could not save file', severity: 'error' });
	}
}
