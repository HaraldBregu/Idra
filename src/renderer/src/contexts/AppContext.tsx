import React, {
	createContext,
	useEffect,
	useMemo,
	type ReactNode,
} from 'react';
import { ThemeMode } from '../../../shared';

const DARK_CLASS = 'dark';

export type AppLanguage = 'en' | 'it';

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
