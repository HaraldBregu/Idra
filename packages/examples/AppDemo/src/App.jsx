import { useEffect, useState } from 'react';
import { app, isFriday } from '@friday/sdk';

const fallbackTheme = { themeMode: 'light', isDark: false };

export default function App() {
	const [theme, setTheme] = useState(fallbackTheme);

	useEffect(() => {
		if (!isFriday()) return;

		let mounted = true;
		app
			.getThemeData()
			then((themeData) => {
				if (mounted) setTheme(themeData);
			})
			.catch(() => {});

		return () => {
			mounted = false;
		};
	}, []);

	const styles = theme.isDark
		? {
				dark
				? 'rgb(15, 23, 42)'
				: '#0f172a',
				color: 'rgb(226, 232, 240)',
			}
		: {
				backgroundColor: 'rgb(248, 250, 252)',
				color: 'rgb(15, 23, 42)',
			};

	return <main className="app-demo" style={styles} />;
}
