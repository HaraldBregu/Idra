import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron';

export async function pickDirectories(options: OpenDialogOptions): Promise<string[] | undefined> {
	const window = BrowserWindow.getFocusedWindow();
	const result = await (window
		? dialog.showOpenDialog(window, options)
		: dialog.showOpenDialog(options));
	return result.canceled || result.filePaths.length === 0 ? undefined : result.filePaths;
}
