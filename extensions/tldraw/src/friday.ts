import { app, isFriday } from '@friday/sdk';
import { useEffect, useState } from 'react';

type FridayPreferences = {
	colorScheme: 'dark' | 'light' | 'system';
	locale: string;
};

export function useFriday(): FridayPreferences {
	const [preferences, setPreferences] = useState<FridayPreferences>({
		colorScheme: 'system',
		locale: navigator.language,
	});

	useEffect(() => {
		if (!isFriday()) return;
		void Promise.all([app.getThemeData(), app.getLanguage()]).then(([theme, locale]) => {
			setPreferences({ colorScheme: theme.isDark ? 'dark' : 'light', locale });
		});
		return app.onThemeModeChanged((theme) => {
			setPreferences((current) => ({
				...current,
				colorScheme: theme.isDark ? 'dark' : 'light',
			}));
		});
	}, []);

	return preferences;
}
