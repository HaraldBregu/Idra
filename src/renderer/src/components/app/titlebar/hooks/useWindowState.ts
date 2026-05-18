import { useState, useEffect } from 'react';

export function useWindowState() {
	const [isFullScreen, setIsFullScreen] = useState(false);

	useEffect(() => {
		if (!window.win) return;

		window.win.isFullScreen().then(setIsFullScreen);

		const unsubFs = window.win.onFullScreenChange(setIsFullScreen);
		return () => {
			unsubFs();
		};
	}, []);

	return { isFullScreen };
}
