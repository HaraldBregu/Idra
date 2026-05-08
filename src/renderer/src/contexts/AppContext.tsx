import React, {
	createContext,
	useCallback,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import i18n from '../i18n';
import { DEFAULT_THEME_MODE, isThemeMode } from '../../../shared/theme';
import type { ThemeMode } from '../../../shared/types';
import { TasksDialog } from '@/components/app/dialogs/TasksDialog';
import { LogDialog } from '@/components/app/dialogs/LogDialog';
import { CronDialog } from '@/components/app/dialogs/CronDialog';
import {
	applyThemeTokens,
	clearThemeTokens,
	readPersistedThemeStyle,
	resolveEffectiveVariant,
	DEFAULT_THEME_ID,
} from '../lib/theme-tokens';

const THEME_STORAGE_KEY = 'app-theme-mode';
const LANGUAGE_STORAGE_KEY = 'app-language';
const DARK_CLASS = 'dark';

export type { ThemeMode } from '../../../shared/types';
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

export function readPersistedTheme(): ThemeMode {
	try {
		const stored = localStorage.getItem(THEME_STORAGE_KEY);
		if (stored && isThemeMode(stored)) return stored;
	} catch {
		/* empty */
	}
	return DEFAULT_THEME_MODE;
}

export function readPersistedLanguage(): AppLanguage {
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

	useEffect(() => {
		if (!window.app?.onThemeChange) return;
		return window.app.onThemeChange((incoming) => {
			setThemeState(incoming);
		});
	}, []);

	useEffect(() => {
		const themeStyleId = readPersistedThemeStyle();
		if (themeStyleId === DEFAULT_THEME_ID) {
			clearThemeTokens();
			return;
		}
		let cancelled = false;
		window.app?.getCustomThemeTokens(themeStyleId).then((manifest) => {
			if (cancelled || !manifest) return;
			const variant = resolveEffectiveVariant();
			applyThemeTokens(manifest[variant]);
		});
		return () => {
			cancelled = true;
		};
	}, [theme]);

	useEffect(() => {
		i18n.changeLanguage(language);
		try {
			localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
		} catch {
			/* empty */
		}
		window.app?.setLanguage(language);
	}, [language]);

	useEffect(() => {
		if (!window.app?.onLanguageChange) return;
		return window.app.onLanguageChange((incoming: string) => {
			if (incoming === 'en' || incoming === 'it') {
				setLanguageState(incoming);
			}
		});
	}, []);

	useEffect(() => {
		const unsubTasks =
			typeof window.app?.onOpenTasksDialog === 'function'
				? window.app.onOpenTasksDialog(openTasksDialog)
				: undefined;
		const unsubLogs =
			typeof window.app?.onOpenLogsDialog === 'function'
				? window.app.onOpenLogsDialog(openLogDialog)
				: undefined;
		const unsubCron =
			typeof window.app?.onOpenCronDialog === 'function'
				? window.app.onOpenCronDialog(openCronDialog)
				: undefined;
		return () => {
			unsubTasks?.();
			unsubLogs?.();
			unsubCron?.();
		};
	}, [openTasksDialog, openLogDialog, openCronDialog]);

	const themeValue = useMemo<ThemeContextValue>(() => ({ theme, setTheme }), [theme, setTheme]);
	const languageValue = useMemo<LanguageContextValue>(
		() => ({ language, setLanguage }),
		[language, setLanguage]
	);

	return (
		<ThemeContext.Provider value={themeValue}>
			<LanguageContext.Provider value={languageValue}>
				{children}
				<TasksDialog open={tasksOpen} onOpenChange={setTasksOpen} />
				<LogDialog open={logOpen} onOpenChange={setLogOpen} />
				<CronDialog open={cronOpen} onOpenChange={setCronOpen} />
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
