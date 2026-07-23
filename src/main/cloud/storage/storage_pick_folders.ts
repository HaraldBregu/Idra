import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron';

export async function pickFolders(): Promise<string[] | undefined> {
	const window = BrowserWindow.getFocusedWindow();
	const options: OpenDialogOptions = {
		title: 'Select folder(s) to push to the bucket',
		properties: ['openDirectory', 'multiSelections'],
	};
	const result = await (window
		? dialog.showOpenDialog(window, options)
		: dialog.showOpenDialog(options));
	return result.canceled || result.filePaths.length === 0 ? undefined : result.filePaths;
}
