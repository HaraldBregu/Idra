import React, {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import i18n from '../i18n';
import { DEFAULT_THEME_MODE, isThemeMode, ThemeMode } from '../../../shared';

const THEME_STORAGE_KEY = 'app-theme-mode';
const LANGUAGE_STORAGE_KEY = 'app-language';
const DARK_CLASS = 'dark';

export type AppLanguage = 'en' | 'it';
export type SidebarState = 'expanded' | 'collapsed';

export interface AppContextValue {
	theme: ThemeMode;
	language: AppLanguage;
	setTheme: (theme: ThemeMode) => void;
	setLanguage: (language: AppLanguage) => void;
	resetState: () => void;
}

interface AppProviderProps {
	children: ReactNode;
	initialState?: { theme?: ThemeMode; language?: AppLanguage };
}

function readPersistedTheme(): ThemeMode {
	try {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		if (stored && isThemeMode(stored)) return stored;
	} catch {
		/* empty */
	}
	return DEFAULT_THEME_MODE;
}

function readPersistedLanguage(): AppLanguage {
	try {
		const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
		if (stored === 'en' || stored === 'it') return stored;
	} catch {
		/* empty */
	}
	return 'en';
}

function applyThemeClass(theme: ThemeMode): void {
	const root = document.documentElement;
	if (theme === 'dark') {
		root.classList.add(DARK_CLASS);
	} else if (theme === 'light') {
		root.classList.remove(DARK_CLASS);
	} else {
		root.classList.toggle(DARK_CLASS, window.matchMedia('(prefers-color-scheme: dark)').matches);
	}
}

applyThemeClass(readPersistedTheme());

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children, initialState }: AppProviderProps): React.JSX.Element {
	const [theme, setThemeState] = useState<ThemeMode>(initialState?.theme ?? readPersistedTheme());
	const [language, setLanguageState] = useState<AppLanguage>(
		initialState?.language ?? readPersistedLanguage()
	);

	const setTheme = useCallback((next: ThemeMode) => setThemeState(next), []);
	const setLanguage = useCallback((next: AppLanguage) => setLanguageState(next), []);
	const resetState = useCallback(() => {
		setThemeState(readPersistedTheme());
		setLanguageState(readPersistedLanguage());
	}, []);

	useEffect(() => {
		applyThemeClass(theme);
		try {
			localStorage.setItem(THEME_STORAGE_KEY, theme);
		} catch {
			/* empty */
		}
	}, [theme]);

	useEffect(() => {
		if (theme !== 'system') return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handleOsChange = (event: MediaQueryListEvent): void => {
			document.documentElement.classList.toggle(DARK_CLASS, event.matches);
		};
		mq.addEventListener('change', handleOsChange);
		return () => mq.removeEventListener('change', handleOsChange);
	}, [theme]);

	useEffect(() => {
		i18n.changeLanguage(language);
		try {
			localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
		} catch {
			/* empty */
		}
	}, [language]);

	const value = useMemo<AppContextValue>(
		() => ({ theme, language, setTheme, setLanguage, resetState }),
		[theme, language, setTheme, setLanguage, resetState]
	);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
	const ctx = useContext(AppContext);
	if (ctx === undefined) throw new Error('useApp must be used within an AppProvider');
	return ctx;
}
