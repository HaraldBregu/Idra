import { useEffect, useState } from 'react';
import { app, isFriday, type AppThemeData } from '@friday/sdk';

const fallbackTheme: AppThemeData = {
	themeMode: 'light',
	isDark: false,
	colors: {},
};

export function useFridayTheme(): AppThemeData {
	const [theme, setTheme] = useState(fallbackTheme);
	useEffect(() => {
		if (!isFriday()) return;
		let active = true;
		app.getThemeData().then((value) => active && setTheme(value)).catch(() => undefined);
		const unsubscribe = app.onThemeModeChanged((value) => active && setTheme(value));
		return () => {
			active = false;
			unsubscribe();
		};
	}, []);
	return theme;
}
