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
import {
	DEFAULT_THEME_MODE,
	isThemeMode,
	type ThemeMode,
	type ThemeVariant,
} from '../../../shared';

const THEME_STORAGE_KEY = 'app-theme-mode';
const TRANSLUCENCY_STORAGE_KEY = 'app-theme-translucency';
const LANGUAGE_STORAGE_KEY = 'app-language';
const DARK_CLASS = 'dark';
const TRANSLUCENCY_ALPHA_REDUCTION = {
	window: 0.95,
	surface: 0.74,
	popover: 0.42,
	sidebar: 0.78,
} as const;

export type AppTranslucency = Record<ThemeVariant, number>;

const DEFAULT_TRANSLUCENCY: AppTranslucency = {
	light: 0,
	dark: 0,
};

export type AppLanguage = 'en' | 'it';
export type SidebarState = 'expanded' | 'collapsed';

export interface AppContextValue {
	theme: ThemeMode;
	translucency: AppTranslucency;
	language: AppLanguage;
	setTheme: (theme: ThemeMode) => void;
	setTranslucency: (mode: ThemeVariant, value: number) => void;
	setLanguage: (language: AppLanguage) => void;
	resetState: () => void;
}

interface AppProviderProps {
	children: ReactNode;
	initialState?: {
		theme?: ThemeMode;
		translucency?: Partial<AppTranslucency>;
		language?: AppLanguage;
	};
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

function clampTranslucency(value: unknown): number {
	const numeric = Number(value);
	if (!Number.isFinite(numeric)) return 0;
	return Math.min(100, Math.max(0, Math.round(numeric)));
}

function normalizeTranslucency(value?: Partial<AppTranslucency>): AppTranslucency {
	return {
		light: clampTranslucency(value?.light ?? DEFAULT_TRANSLUCENCY.light),
		dark: clampTranslucency(value?.dark ?? DEFAULT_TRANSLUCENCY.dark),
	};
}

function readPersistedTranslucency(): AppTranslucency {
	try {
		const stored = localStorage.getItem(TRANSLUCENCY_STORAGE_KEY);
		if (!stored) return DEFAULT_TRANSLUCENCY;
		return normalizeTranslucency(JSON.parse(stored) as Partial<AppTranslucency>);
	} catch {
		return DEFAULT_TRANSLUCENCY;
	}
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

function resolveActiveThemeVariant(theme: ThemeMode): ThemeVariant {
	if (theme !== 'system') return theme;
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function opacityFromTranslucency(value: number, alphaReduction: number): string {
	const t = clampTranslucency(value);
	return String(1 - (t / 100) * alphaReduction);
}

function applyTranslucency(theme: ThemeMode, translucency: AppTranslucency): void {
	const activeMode = resolveActiveThemeVariant(theme);
	const value = translucency[activeMode];
	const root = document.documentElement;
	root.style.setProperty(
		'--app-bg-opacity',
		opacityFromTranslucency(value, TRANSLUCENCY_ALPHA_REDUCTION.window)
	);
	root.style.setProperty(
		'--app-surface-opacity',
		opacityFromTranslucency(value, TRANSLUCENCY_ALPHA_REDUCTION.surface)
	);
	root.style.setProperty(
		'--app-popover-opacity',
		opacityFromTranslucency(value, TRANSLUCENCY_ALPHA_REDUCTION.popover)
	);
	root.style.setProperty(
		'--app-sidebar-opacity',
		opacityFromTranslucency(value, TRANSLUCENCY_ALPHA_REDUCTION.sidebar)
	);
}

applyThemeClass(readPersistedTheme());

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children, initialState }: AppProviderProps): React.JSX.Element {
	const [theme, setThemeState] = useState<ThemeMode>(initialState?.theme ?? readPersistedTheme());
	const [translucency, setTranslucencyState] = useState<AppTranslucency>(
		normalizeTranslucency(initialState?.translucency ?? readPersistedTranslucency())
	);
	const [language, setLanguageState] = useState<AppLanguage>(
		initialState?.language ?? readPersistedLanguage()
	);

	const setTheme = useCallback((next: ThemeMode) => setThemeState(next), []);
	const setTranslucency = useCallback((mode: ThemeVariant, value: number) => {
		setTranslucencyState((current) => ({
			...current,
			[mode]: clampTranslucency(value),
		}));
	}, []);
	const setLanguage = useCallback((next: AppLanguage) => setLanguageState(next), []);
	const resetState = useCallback(() => {
		setThemeState(readPersistedTheme());
		setTranslucencyState(readPersistedTranslucency());
		setLanguageState(readPersistedLanguage());
	}, []);

	useEffect(() => {
		applyThemeClass(theme);
		applyTranslucency(theme, translucency);
		try {
			localStorage.setItem(THEME_STORAGE_KEY, theme);
		} catch {
			/* empty */
		}
	}, [theme, translucency]);

	useEffect(() => {
		try {
			localStorage.setItem(TRANSLUCENCY_STORAGE_KEY, JSON.stringify(translucency));
		} catch {
			/* empty */
		}
	}, [translucency]);

	useEffect(() => {
		if (theme !== 'system') return;
		const mq = window.matchMedia('(prefers-color-scheme: dark)');
		const handleOsChange = (event: MediaQueryListEvent): void => {
			document.documentElement.classList.toggle(DARK_CLASS, event.matches);
			applyTranslucency(theme, translucency);
		};
		mq.addEventListener('change', handleOsChange);
		return () => mq.removeEventListener('change', handleOsChange);
	}, [theme, translucency]);

	useEffect(() => {
		i18n.changeLanguage(language);
		try {
			localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
		} catch {
			/* empty */
		}
	}, [language]);

	const value = useMemo<AppContextValue>(
		() => ({ theme, translucency, language, setTheme, setTranslucency, setLanguage, resetState }),
		[theme, translucency, language, setTheme, setTranslucency, setLanguage, resetState]
	);

	return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
	const ctx = useContext(AppContext);
	if (ctx === undefined) throw new Error('useApp must be used within an AppProvider');
	return ctx;
}
