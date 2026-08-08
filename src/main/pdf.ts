import { BrowserWindow, clipboard, Menu, type WebContents } from 'electron';

export function setupPdfContextMenu(
	window: BrowserWindow,
	webContents: WebContents = window.webContents
): void {
	webContents.on('context-menu', (_event, params) => {
		try {
			const url = new URL(params.frameURL);
			if (
				url.protocol !== 'local-resource:' ||
				url.host !== 'agent' ||
				!url.pathname.toLowerCase().endsWith('.pdf')
			) {
				return;
			}
			const filePath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
			Menu.buildFromTemplate([
				{ role: 'copy', enabled: Boolean(params.selectionText) },
				{ role: 'selectAll' },
				{ type: 'separator' },
				{ label: 'Copy Path', click: () => clipboard.writeText(filePath) },
			]).popup({ window });
		} catch {
			return;
		}
	});
}
