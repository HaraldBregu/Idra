import React, {
	createContext,
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import { DEFAULT_THEME_MODE, isThemeMode, ThemeMode } from '../../../shared';

const THEME_STORAGE_KEY = 'app-theme-mode';
const LANGUAGE_STORAGE_KEY = 'app-language';
const DARK_CLASS = 'dark';

export type AppLanguage = 'en' | 'it';
export type SidebarState = 'expanded' | 'collapsed';

export interface AppState {
	theme: ThemeMode;
	language: AppLanguage;
}

export interface AppActionsContextValue {
	setTheme: (theme: ThemeMode) => void;
	setLanguage: (language: AppLanguage) => void;
	resetState: () => void;
}

export interface ThemeContextValue {
	theme: ThemeMode;
	setTheme: (theme: ThemeMode) => void;
}

export interface LanguageContextValue {
	language: AppLanguage;
	setLanguage: (language: AppLanguage) => void;
}

interface AppProviderProps {
	children: ReactNode;
	initialState?: Partial<AppState>;
}



export function AppProvider({ children, initialState }: AppProviderProps): React.JSX.Element {
	const [theme, setThemeState] = useState<ThemeMode>(initialState?.theme ?? readPersistedTheme());
	const [language, setLanguageState] = useState<AppLanguage>(
		initialState?.language ?? readPersistedLanguage()
	);
	const [tasksOpen, setTasksOpen] = useState(false);
	const [logOpen, setLogOpen] = useState(false);
	const [cronOpen, setCronOpen] = useState(false);

	const setTheme = useCallback((next: ThemeMode) => setThemeState(next), []);
	const setLanguage = useCallback((next: AppLanguage) => setLanguageState(next), []);
	const openTasksDialog = useCallback(() => setTasksOpen(true), []);
	const openLogDialog = useCallback(() => setLogOpen(true), []);
	const openCronDialog = useCallback(() => setCronOpen(true), []);

	useEffect(() => {
		applyThemeClass(theme);
		try {
			localStorage.setItem(THEME_STORAGE_KEY, theme);
		} catch {
			/* empty */
		}
		window.app?.setTheme(theme);
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

	const themeValue = useMemo<ThemeContextValue>(() => ({ theme, setTheme }), [theme, setTheme]);
	const languageValue = useMemo<LanguageContextValue>(
		() => ({ language, setLanguage }),
		[language, setLanguage]
	);

	return (
		<ThemeContext.Provider value={themeValue}>
			<LanguageContext.Provider value={languageValue}>
				{children}
			</LanguageContext.Provider>
		</ThemeContext.Provider>
	);
}

export const AppStateContext = createContext<AppState | undefined>(undefined);
export const AppActionsContext = createContext<AppActionsContextValue | undefined>(undefined);
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export interface AppContextValue {
	state: AppState;
	dispatch: React.Dispatch<never>;
}
