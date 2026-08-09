type ExcalidrawWindow = Window & {
	EXCALIDRAW_ASSET_PATH?: string | string[];
};

(window as ExcalidrawWindow).EXCALIDRAW_ASSET_PATH = new URL(
	'./',
	window.location.href
).toString();

void import('./render');
