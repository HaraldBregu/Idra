import { useEffect, useState } from 'react';
import { cva } from 'class-variance-authority';

import { app, isFriday } from '@friday/sdk';
import { cn } from './lib/utils.js';

const fallbackTheme = { themeMode: 'light', isDark: false };
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

	return (
		<main className={cn('app-demo', theme.isDark ? 'dark-mode' : 'light-mode')}>
			<div className="flex h-full items-center justify-center p-8">
				<div className="w-full max-w-md space-y-4 rounded-xl border p-6">
					<p className="text-lg font-semibold">Theme preview</p>
					<p className="text-sm">Theme mode from app IPC: {theme.themeMode}</p>
					<p className="text-sm">Resolved dark mode: {theme.isDark ? 'true' : 'false'}</p>
					<span className={themeBadgeClass({ variant: theme.isDark ? 'dark' : 'light' })}>
						{theme.isDark ? 'Dark' : 'Light'}
					</span>
				</div>
			</div>
		</main>
	);
}
