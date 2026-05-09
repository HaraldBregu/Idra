export const THEME_VARIANTS = ['light', 'dark'] as const satisfies readonly ThemeVariant[];
export const THEME_MODES = ['light', 'dark', 'system'] as const satisfies readonly ThemeMode[];
export const DEFAULT_THEME_MODE: ThemeMode = 'system';

export const LIGHT_THEME: ThemeData = {
	background: '0 0% 97%',
	foreground: '0 0% 8%',
	card: '0 0% 100%',
	'card-foreground': '0 0% 8%',
	popover: '0 0% 100%',
	'popover-foreground': '0 0% 8%',
	primary: '0 0% 9%',
	'primary-foreground': '0 0% 98%',
	secondary: '0 0% 93%',
	'secondary-foreground': '0 0% 10%',
	muted: '0 0% 95%',
	'muted-foreground': '0 0% 38%',
	accent: '0 0% 92%',
	'accent-foreground': '0 0% 10%',
	destructive: '0 74% 54%',
	'destructive-foreground': '0 0% 98%',
	border: '0 0% 87%',
	input: '0 0% 87%',
	ring: '0 0% 18%',
	radius: '0.5rem',
	success: '148 64% 40%',
	'success-foreground': '0 0% 98%',
	warning: '34 92% 44%',
	'warning-foreground': '25 95% 12%',
	info: '215 70% 48%',
	'info-foreground': '0 0% 98%',
	'sidebar-background': '0 0% 95%',
	'sidebar-foreground': '0 0% 14%',
	'sidebar-primary': '0 0% 9%',
	'sidebar-primary-foreground': '0 0% 98%',
	'sidebar-accent': '0 0% 91%',
	'sidebar-accent-foreground': '0 0% 10%',
	'sidebar-border': '0 0% 86%',
	'sidebar-ring': '0 0% 18%',
};

export const DARK_THEME: ThemeData = {
	background: '220 5% 8%',
	foreground: '30 14% 86%',
	card: '24 6% 13%',
	'card-foreground': '30 14% 86%',
	popover: '24 6% 13%',
	'popover-foreground': '30 14% 86%',
	primary: '23 45% 52%',
	'primary-foreground': '24 18% 10%',
	secondary: '24 5% 16%',
	'secondary-foreground': '30 12% 84%',
	muted: '24 5% 16%',
	'muted-foreground': '28 10% 67%',
	accent: '24 9% 19%',
	'accent-foreground': '30 14% 86%',
	destructive: '0 72% 61%',
	'destructive-foreground': '0 0% 98%',
	border: '24 6% 22%',
	input: '24 6% 22%',
	ring: '23 32% 58%',
	radius: '0.5rem',
	success: '148 42% 52%',
	'success-foreground': '148 28% 10%',
	warning: '30 72% 60%',
	'warning-foreground': '28 40% 12%',
	info: '205 46% 63%',
	'info-foreground': '210 40% 10%',
	'sidebar-background': '220 5% 9%',
	'sidebar-foreground': '30 14% 84%',
	'sidebar-primary': '23 45% 52%',
	'sidebar-primary-foreground': '24 18% 10%',
	'sidebar-accent': '24 7% 16%',
	'sidebar-accent-foreground': '30 14% 86%',
	'sidebar-border': '24 6% 18%',
	'sidebar-ring': '23 32% 58%',
};

export const THEMES: Record<ThemeVariant, ThemeData> = {
	light: LIGHT_THEME,
	dark: DARK_THEME,
};

export function isThemeMode(value: string): value is ThemeMode {
	return (THEME_MODES as readonly string[]).includes(value);
}

export type ThemeVariant = 'light' | 'dark';
export type ThemeMode = ThemeVariant | 'system';

export interface ThemeData {
	readonly background: string;
	readonly foreground: string;
	readonly card: string;
	readonly 'card-foreground': string;
	readonly popover: string;
	readonly 'popover-foreground': string;
	readonly primary: string;
	readonly 'primary-foreground': string;
	readonly secondary: string;
	readonly 'secondary-foreground': string;
	readonly muted: string;
	readonly 'muted-foreground': string;
	readonly accent: string;
	readonly 'accent-foreground': string;
	readonly destructive: string;
	readonly 'destructive-foreground': string;
	readonly border: string;
	readonly input: string;
	readonly ring: string;
	readonly radius: string;
	readonly success: string;
	readonly 'success-foreground': string;
	readonly warning: string;
	readonly 'warning-foreground': string;
	readonly info: string;
	readonly 'info-foreground': string;
	readonly 'sidebar-background': string;
	readonly 'sidebar-foreground': string;
	readonly 'sidebar-primary': string;
	readonly 'sidebar-primary-foreground': string;
	readonly 'sidebar-accent': string;
	readonly 'sidebar-accent-foreground': string;
	readonly 'sidebar-border': string;
	readonly 'sidebar-ring': string;
}

export interface Theme {
	readonly name: string;
	readonly description: string;
	readonly author: string;
	readonly version: string;
	readonly license: string;
	readonly light: ThemeData;
	readonly dark: ThemeData;
}

export interface CustomThemeInfo {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly author: string;
	readonly version: string;
	readonly license: string;
}