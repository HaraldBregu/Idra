import { useEffect, useState } from 'react';

import { app, isFriday } from '@friday/sdk';
import { cn } from './lib/utils.js';

const fallbackTheme = { themeMode: 'light', isDark: false };

export default function App() {
	const [theme, setTheme] = useState(fallbackTheme);

	useEffect(() => {
		if (!isFriday()) return;

		let mounted = true;
		app
			.getThemeData()
			.then((themeData) => {
				if (mounted) setTheme(themeData);
			})
			.catch(() => {});

		return () => {
			mounted = false;
		};
	}, []);

	return <main className={cn('app-demo', theme.isDark ? 'dark-mode' : 'light-mode')} />;
}
