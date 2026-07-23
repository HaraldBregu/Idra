import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron';

export async function pickFiles(): Promise<string[] | undefined> {
	const window = BrowserWindow.getFocusedWindow();
	const options: OpenDialogOptions = {
		title: 'Select file(s) to push to the bucket',
		properties: ['openFile', 'multiSelections'],
	};
	const result = await (window
		? dialog.showOpenDialog(window, options)
		: dialog.showOpenDialog(options));
	return result.canceled || result.filePaths.length === 0 ? undefined : result.filePaths;
}
