import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron';
import { userDataLocation } from '../../shared/user_data_location';

export async function pickFolders(): Promise<string[] | undefined> {
	const window = BrowserWindow.getFocusedWindow();
	const options: OpenDialogOptions = {
		title: 'Select folder(s) to push to the bucket',
		defaultPath: userDataLocation(),
		properties: ['openDirectory', 'multiSelections'],
	};
	const result = await (window
		? dialog.showOpenDialog(window, options)
		: dialog.showOpenDialog(options));
	return result.canceled || result.filePaths.length === 0 ? undefined : result.filePaths;
}
