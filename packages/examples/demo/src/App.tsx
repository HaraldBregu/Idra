import { useEffect, useState, type CSSProperties } from 'react';
import { cva } from 'class-variance-authority';

import {
	app,
	isFriday,
	type AppLanguage,
	type AppTheme,
	type AppThemeColors,
	type AppThemeData,
} from '@friday/sdk';
import { cn } from './lib/utils';
import { Button } from './components/ui/button';

const fallbackColors: AppThemeColors = {
	'radius': '0.625rem',
	'app-window-radius': '16px',
	'app-bg-opacity': '1',
	'app-surface-opacity': '1',
	'app-popover-opacity': '1',
	'app-sidebar-opacity': '1',
	'app-window-background-base': '#fbfbfa',
	'app-surface-background-base': '#ffffff',
	'app-popover-background-base': '#ffffff',
	'app-sidebar-background-base': '#fafaf8',
	'app-window-border': '#19635f',
	'app-window-background':
		'color-mix(in oklch, var(--app-window-background-base) calc(var(--app-bg-opacity) * 100%), transparent)',
	'app-surface-background':
		'color-mix(in oklch, var(--app-surface-background-base) calc(var(--app-surface-opacity) * 100%), transparent)',
	'app-popover-background':
		'color-mix(in oklch, var(--app-popover-background-base) calc(var(--app-popover-opacity) * 100%), transparent)',
	'app-sidebar-background':
		'color-mix(in oklch, var(--app-sidebar-background-base) calc(var(--app-sidebar-opacity) * 100%), transparent)',
	'background': 'var(--app-window-background)',
	'foreground': '#0e0e0e',
	'card': 'var(--app-surface-background)',
	'card-foreground': '#0e0e0e',
	'primary': '#0e0e0e',
	'primary-foreground': '#fbfbfa',
	'secondary': '#eeede9',
	'secondary-foreground': '#0e0e0e',
	'muted': '#eeede9',
	'muted-foreground': '#a3a7a7',
	'accent': '#eae9e5',
	'accent-foreground': '#0e0e0e',
	'border': 'color-mix(in oklch, #a3a7a7 45%, transparent)',
	'input': 'color-mix(in oklch, #a3a7a7 45%, transparent)',
	'ring': '#2b5fb1',
};
const fallbackTheme: AppThemeData = { themeMode: 'light', isDark: false, colors: fallbackColors };
const fallbackLanguage: AppLanguage = 'en';
const themeBadgeClass = cva('inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold', {
	variants: {
		variant: {
			light: 'border-border bg-secondary text-secondary-foreground',
			dark: 'border-border bg-secondary text-secondary-foreground',
		},
	},
	defaultVariants: {
		variant: 'light',
	},
});

export default function App() {
	const [theme, setTheme] = useState<AppThemeData>(fallbackTheme);
	const [language, setLanguage] = useState<AppLanguage>(fallbackLanguage);
	const [status, setStatus] = useState('Waiting for app data');
	const inFridayApp = isFriday();
	const themeStyle = Object.fromEntries(
		Object.entries(theme.colors).map(([name, value]) => [`--${name}`, value]),
	) as CSSProperties;

	const ensureFridayApp = () => {
		if (!isFriday()) {
			setStatus('Friday app runtime not connected. Run inside the app host to use live data.');
			return false;
		}
		return true;
	};

	const getStatusText = (themeData: AppThemeData, appLanguage: AppLanguage): string => {
		return `theme=${themeData.themeMode}, resolved-dark=${String(themeData.isDark)}, language=${appLanguage}`;
	};

	const refreshTheme = async () => {
		if (!ensureFridayApp()) return;
		try {
			const themeData = await app.getThemeData();
			setTheme(themeData);
			setStatus(`theme refreshed (${getStatusText(themeData, language)})`);
		} catch {
			setStatus('failed to refresh theme');
		}
	};

	const refreshLanguage = async () => {
		if (!ensureFridayApp()) return;
		try {
			const appLanguage = await app.getLanguage();
			setLanguage(appLanguage);
			setStatus(`language refreshed (${getStatusText(theme, appLanguage)})`);
		} catch {
			setStatus('failed to refresh language');
		}
	};

	const setAppTheme = async (nextTheme: AppTheme) => {
		if (!ensureFridayApp()) return;
		try {
			await app.setTheme(nextTheme);
			await refreshTheme();
			setStatus(`theme set to ${nextTheme}`);
		} catch {
			setStatus('failed to set theme');
		}
	};

	const setAppLanguage = async (nextLanguage: AppLanguage) => {
		if (!ensureFridayApp()) return;
		try {
			await app.setLanguage(nextLanguage);
			await refreshLanguage();
			setStatus(`language set to ${nextLanguage}`);
		} catch {
			setStatus('failed to set language');
		}
	};

	const printThemeData = async () => {
		if (!ensureFridayApp()) return;
		try {
			const themeData = await app.getThemeData();
			setTheme(themeData);
			console.log('Friday app theme data', themeData);
			setStatus('theme data printed to browser console');
		} catch {
			setStatus('failed to print theme data');
		}
	};

	useEffect(() => {
		if (!isFriday()) return;

		let mounted = true;
		const loadCurrentState = async () => {
			try {
				const [themeData, appLanguage] = await Promise.all([app.getThemeData(), app.getLanguage()]);
				if (!mounted) return;
				setTheme(themeData);
				setLanguage(appLanguage);
				setStatus(`loaded (${getStatusText(themeData, appLanguage)})`);
			} catch {
				if (mounted) setStatus('failed to load app data');
			}
		};
		void loadCurrentState();
		const unsubscribe = app.onThemeModeChanged((themeData) => {
			if (!mounted) return;
			setTheme(themeData);
			setStatus(`theme changed (${getStatusText(themeData, language)})`);
		});

		return () => {
			mounted = false;
			unsubscribe();
		};
	}, []);

	return (
		<main className={cn('app-demo', theme.isDark && 'dark')} style={themeStyle}>
			<div className="flex h-full items-center justify-center p-8">
				<div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm">
					<p className="text-lg font-semibold">Friday app IPC demo</p>
					<p className="text-sm text-muted-foreground">{inFridayApp ? 'Connected to Friday app runtime.' : 'Running outside Friday app. Buttons are available but use app actions from host runtime only.'}</p>
					<div className="space-y-2">
						<p className="text-sm font-semibold">Theme</p>
						<p className="text-sm">Theme mode from app IPC: {theme.themeMode}</p>
						<p className="text-sm">Resolved dark mode: {theme.isDark ? 'true' : 'false'}</p>
						<div className="mt-2 flex flex-wrap gap-2">
							<Button variant="outline" onClick={() => setAppTheme('light')}>
								Set light
							</Button>
							<Button variant="outline" onClick={() => setAppTheme('dark')}>
								Set dark
							</Button>
							<Button variant="outline" onClick={() => setAppTheme('system')}>
								Set system
							</Button>
							<Button variant="secondary" onClick={refreshTheme}>
								Get theme
							</Button>
							<Button onClick={printThemeData}>Print theme data</Button>
						</div>
					</div>
					<div className="space-y-2">
						<p className="text-sm font-semibold">Language</p>
						<p className="text-sm">Current language from app IPC: {language}</p>
						<div className="mt-2 flex flex-wrap gap-2">
							<Button variant="outline" onClick={() => setAppLanguage('en')}>
								Set EN
							</Button>
							<Button variant="outline" onClick={() => setAppLanguage('it')}>
								Set IT
							</Button>
							<Button variant="secondary" onClick={refreshLanguage}>
								Get language
							</Button>
						</div>
					</div>
					<p className="text-sm text-muted-foreground">Status: {status}</p>
					<span className={themeBadgeClass({ variant: theme.isDark ? 'dark' : 'light' })}>
						{theme.isDark ? 'Dark' : 'Light'}
					</span>
				</div>
			</div>
		</main>
	);
}
