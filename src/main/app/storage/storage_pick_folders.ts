import { BrowserWindow, dialog } from 'electron';

export async function pickFolders(): Promise<string[]> {
	const options = {
		properties: ['openDirectory' as const, 'multiSelections' as const],
	};
	const window = BrowserWindow.getFocusedWindow();
	const result = await (window
		? dialog.showOpenDialog(window, options)
		: dialog.showOpenDialog(options));
	return result.canceled ? [] : result.filePaths;
}
