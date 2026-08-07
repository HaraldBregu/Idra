import { useEffect, useState } from 'react';
import { cva } from 'class-variance-authority';

import { app, isFriday, type AppLanguage, type AppTheme, type AppThemeData } from '@friday/sdk';
import { cn } from './lib/utils';
import { Button } from './components/ui/button';

const fallbackTheme: AppThemeData = { themeMode: 'light', isDark: false };
const fallbackLanguage: AppLanguage = 'en';
const themeBadgeClass = cva('inline-flex h-9 items-center rounded-full border px-4 text-sm font-semibold', {
	variants: {
		variant: {
			light: 'border-slate-300 bg-white text-slate-900',
			dark: 'border-slate-700 bg-slate-900 text-slate-100',
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
		<main className={cn('app-demo', theme.isDark ? 'dark-mode' : 'light-mode')}>
			<div className="flex h-full items-center justify-center p-8">
				<div className="w-full max-w-md space-y-4 rounded-xl border p-6">
					<p className="text-lg font-semibold">Friday app IPC demo</p>
					<p className="text-sm text-orange-600">{inFridayApp ? 'Connected to Friday app runtime.' : 'Running outside Friday app. Buttons are available but use app actions from host runtime only.'}</p>
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
					<p className="text-sm">Status: {status}</p>
					<span className={themeBadgeClass({ variant: theme.isDark ? 'dark' : 'light' })}>
						{theme.isDark ? 'Dark' : 'Light'}
					</span>
				</div>
			</div>
		</main>
	);
}
