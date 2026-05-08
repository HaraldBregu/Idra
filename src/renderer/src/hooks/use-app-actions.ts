import { useCallback, useMemo } from 'react';
import { useTheme } from './use-theme';
import { useLanguageContext } from './use-language-context';
import {
	readPersistedLanguage,
	readPersistedTheme,
	type AppActionsContextValue,
} from '../contexts/AppContext';

export function useAppActions(): AppActionsContextValue {
	const { setTheme } = useTheme();
	const { setLanguage } = useLanguageContext();

	const resetState = useCallback(() => {
		setTheme(readPersistedTheme());
		setLanguage(readPersistedLanguage());
	}, [setTheme, setLanguage]);

	return useMemo(
		() => ({ setTheme, setLanguage, resetState }),
		[setTheme, setLanguage, resetState]
	);
}
