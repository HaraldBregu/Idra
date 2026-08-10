import { useEffect, useState } from 'react';
import { app, isFriday, type AppThemeData } from '@friday/sdk';

const fallbackTheme: AppThemeData = {
	themeMode: 'light',
	isDark: false,
	colors: {},
};

export function useFridayTheme(): AppThemeData {
	const [theme, setTheme] = useState<AppThemeData>(fallbackTheme);

	useEffect(() => {
		if (!isFriday()) return;

		let active = true;
		app
			.getThemeData()
			.then((themeData) => {
				if (active) setTheme(themeData);
			})
			.catch(() => undefined);

		const unsubscribe = app.onThemeModeChanged((themeData) => {
			if (active) setTheme(themeData);
		});

		return () => {
			active = false;
			unsubscribe();
		};
	}, []);

	useEffect(() => {
		const root = document.documentElement;
		root.classList.toggle('dark', theme.isDark);
		for (const [name, value] of Object.entries(theme.colors)) {
			root.style.setProperty(`--${name}`, value);
		}
	}, [theme]);

	return theme;
}
