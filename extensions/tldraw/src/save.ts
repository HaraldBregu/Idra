import { serializeTldrawJsonBlob, type Editor } from 'tldraw';

export async function saveDocument(editor: Editor): Promise<void> {
	const blob = await serializeTldrawJsonBlob(editor);
	const pageName = editor.getCurrentPage().name.trim() || 'drawing';
	const fileName = `${pageName.replaceAll(/[^a-z0-9._-]+/gi, '-')}.tldr`;
	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);
	link.href = url;
	link.download = fileName;
	link.click();
	URL.revokeObjectURL(url);
}
