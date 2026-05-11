import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import type { LoggerService } from '../logger';
import { CustomThemeInfo, Theme, ThemeData } from '../../shared';
import { getDefaultDataDirectory } from '../utils';

const THEME_FILE_NAME = 'theme.json';

const THEME_DATA_KEYS: readonly (keyof ThemeData)[] = [
	'background',
	'foreground',
	'card',
	'card-foreground',
	'popover',
	'popover-foreground',
	'primary',
	'primary-foreground',
	'secondary',
	'secondary-foreground',
	'muted',
	'muted-foreground',
	'accent',
	'accent-foreground',
	'destructive',
	'destructive-foreground',
	'border',
	'input',
	'ring',
	'radius',
	'success',
	'success-foreground',
	'warning',
	'warning-foreground',
	'info',
	'info-foreground',
	'sidebar-background',
	'sidebar-foreground',
	'sidebar-primary',
	'sidebar-primary-foreground',
	'sidebar-accent',
	'sidebar-accent-foreground',
	'sidebar-border',
	'sidebar-ring',
] as const;

const THEME_REQUIRED_FIELDS = ['name', 'description', 'author', 'version', 'license'] as const;

/**
 * Service responsible for discovering and importing custom themes
 * stored in the application's userData/themes directory.
 */
export class ThemeService {
	private readonly logger: LoggerService;

	constructor(logger: LoggerService) {
		this.logger = logger;
	}

	getThemesDirectory(): string {
		const themesDir = path.join(getDefaultDataDirectory(), 'themes');
		fs.mkdirSync(themesDir, { recursive: true });
		return themesDir;
	}

	listThemes(): CustomThemeInfo[] {
		const themesDir = this.getThemesDirectory();
		const themes: CustomThemeInfo[] = [];

		let entries: fs.Dirent[];
		try {
			entries = fs.readdirSync(themesDir, { withFileTypes: true });
		} catch (err) {
			this.logger.error('ThemeService', 'Failed to read themes directory', err);
			return [];
		}

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;

			const themePath = path.join(themesDir, entry.name, THEME_FILE_NAME);
			if (!fs.existsSync(themePath)) continue;

			try {
				const raw = fs.readFileSync(themePath, 'utf-8');
				const parsed: unknown = JSON.parse(raw);
				const theme = this.validateTheme(parsed);

				themes.push({
					id: entry.name,
					name: theme.name,
					description: theme.description,
					author: theme.author,
					version: theme.version,
					license: theme.license,
				});
			} catch (err) {
				this.logger.warn('ThemeService', `Skipping invalid theme "${entry.name}"`, err);
			}
		}

		return themes;
	}

	getThemeById(id: string): Theme | null {
		const themePath = path.join(this.getThemesDirectory(), id, THEME_FILE_NAME);
		if (!fs.existsSync(themePath)) return null;

		try {
			const raw = fs.readFileSync(themePath, 'utf-8');
			const parsed: unknown = JSON.parse(raw);
			return this.validateTheme(parsed);
		} catch (err) {
			this.logger.warn('ThemeService', `Failed to load theme "${id}"`, err);
			return null;
		}
	}

	importThemeFromPath(sourcePath: string): CustomThemeInfo {
		const themePath = path.join(sourcePath, THEME_FILE_NAME);
		if (!fs.existsSync(themePath)) {
			throw new Error(`No ${THEME_FILE_NAME} found in the selected folder`);
		}

		const raw = fs.readFileSync(themePath, 'utf-8');
		const parsed: unknown = JSON.parse(raw);
		const theme = this.validateTheme(parsed);

		const folderName = this.sanitizeFolderName(theme.name);
		if (folderName.length === 0) {
			throw new Error('Theme name results in an empty folder name after sanitization');
		}

		const destPath = path.join(this.getThemesDirectory(), folderName);
		fs.cpSync(sourcePath, destPath, { recursive: true });

		this.logger.info('ThemeService', `Imported theme "${theme.name}" to ${destPath}`);

		return {
			id: folderName,
			name: theme.name,
			description: theme.description,
			author: theme.author,
			version: theme.version,
			license: theme.license,
		};
	}

	private validateTheme(data: unknown): Theme {
		if (typeof data !== 'object' || data === null) {
			throw new Error('Theme must be a JSON object');
		}

		const obj = data as Record<string, unknown>;

		for (const field of THEME_REQUIRED_FIELDS) {
			if (typeof obj[field] !== 'string' || (obj[field] as string).trim().length === 0) {
				throw new Error(`Theme is missing required field: "${field}"`);
			}
		}

		this.validateThemeData(obj['light'], 'light');
		this.validateThemeData(obj['dark'], 'dark');

		return data as Theme;
	}

	private validateThemeData(data: unknown, variant: string): void {
		if (typeof data !== 'object' || data === null) {
			throw new Error(`Theme is missing "${variant}" data object`);
		}

		const obj = data as Record<string, unknown>;
		for (const key of THEME_DATA_KEYS) {
			if (typeof obj[key] !== 'string') {
				throw new Error(`Theme "${variant}" data missing required key: "${key}"`);
			}
		}
	}

	deleteTheme(id: string): void {
		const themesDir = this.getThemesDirectory();
		const themeDir = path.join(themesDir, id);

		if (!themeDir.startsWith(themesDir + path.sep)) {
			throw new Error('Invalid theme id');
		}

		if (!fs.existsSync(themeDir)) {
			throw new Error(`Theme "${id}" not found`);
		}

		fs.rmSync(themeDir, { recursive: true });
		this.logger.info('ThemeService', `Deleted theme "${id}"`);
	}

	private sanitizeFolderName(name: string): string {
		return name
			.replace(/[<>:"/\\|?*\p{Cc}]/gu, '')
			.replace(/\s+/g, '_')
			.trim();
	}
}
