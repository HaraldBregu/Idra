import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ButtonGroup } from '@/components/ui/ButtonGroup';
import { Moon, Monitor, Sun } from 'lucide-react';
import type { AppLanguage } from '../../../contexts';
import type { ThemeMode } from '../../../../../shared/types';
import type { CustomThemeInfo } from '../../../../../shared/types';
import { useApp } from '@/contexts';
import {
	applyThemeTokens,
	clearThemeTokens,
	resolveEffectiveVariant,
	THEME_STYLE_STORAGE_KEY,
	DEFAULT_THEME_ID,
} from '../../../lib/theme-tokens';

interface LanguageOption {
	readonly value: AppLanguage;
	readonly labelKey: string;
}

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
	{ value: 'en', labelKey: 'settings.language.en' },
	{ value: 'it', labelKey: 'settings.language.it' },
] as const;

const SystemPage: React.FC = () => {
	const { t } = useTranslation();
	const { theme, language, setTheme, setLanguage } = useApp();

	const [customThemes, setCustomThemes] = useState<CustomThemeInfo[]>([]);
	const [activeThemeId, setActiveThemeId] = useState<string>(() => {
		try {
			return localStorage.getItem(THEME_STYLE_STORAGE_KEY) ?? DEFAULT_THEME_ID;
		} catch {
			return DEFAULT_THEME_ID;
		}
	});

	const loadCustomThemes = useCallback(async () => {
		try {
			const list = await window.app.getCustomThemes();
			setCustomThemes(list);
		} catch {
			setCustomThemes([]);
		}
	}, []);

	useEffect(() => {
		loadCustomThemes();
	}, [loadCustomThemes]);

	const handleThemeStyleChange = useCallback(async (next: string | null): Promise<void> => {
		if (next === null) return;
		setActiveThemeId(next);
		try {
			localStorage.setItem(THEME_STYLE_STORAGE_KEY, next);
		} catch {
			/* empty */
		}
		if (next === DEFAULT_THEME_ID) {
			clearThemeTokens();
			return;
		}
		const manifest = await window.app.getCustomThemeTokens(next);
		if (!manifest) return;
		const variant = resolveEffectiveVariant();
		applyThemeTokens(manifest[variant]);
	}, []);

	const handleThemeChange = (next: ThemeMode): void => {
		setTheme(next);
	};

	const handleLanguageChange = (next: string | null): void => {
		if (next === null) return;
		const option = LANGUAGE_OPTIONS.find((o) => o.value === next);
		if (option) setLanguage(option.value);
	};

	return (
		<div className="w-full max-w-2xl">
			<h1 className="text-lg font-normal mb-6">{t('settings.tabs.system')}</h1>

			<div className="pt-6 pb-2 first:pt-0">
				<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					{t('settings.sections.layout')}
				</h2>
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm">
					<div className="flex flex-1 flex-col gap-1">
						<h3 className="text-sm leading-snug font-medium">{t('settings.theme.title')}</h3>
						<p className="text-sm leading-normal text-muted-foreground">
							{t('settings.theme.description')}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<ButtonGroup>
							<Button
								variant={theme === 'light' ? 'outline-selected' : 'outline'}
								size="icon-sm"
								onClick={() => handleThemeChange('light')}
								aria-label={t('settings.theme.light')}
								aria-pressed={theme === 'light'}
							>
								<Sun className="size-3.5" />
							</Button>
							<Button
								variant={theme === 'system' ? 'outline-selected' : 'outline'}
								size="icon-sm"
								onClick={() => handleThemeChange('system')}
								aria-label={t('settings.theme.system')}
								aria-pressed={theme === 'system'}
							>
								<Monitor className="size-3.5" />
							</Button>
							<Button
								variant={theme === 'dark' ? 'outline-selected' : 'outline'}
								size="icon-sm"
								onClick={() => handleThemeChange('dark')}
								aria-label={t('settings.theme.dark')}
								aria-pressed={theme === 'dark'}
							>
								<Moon className="size-3.5" />
							</Button>
						</ButtonGroup>
					</div>
				</div>

				<div className="flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm">
					<div className="flex flex-1 flex-col gap-1">
						<h3 className="text-sm leading-snug font-medium">{t('settings.appTheme.title')}</h3>
						<p className="text-sm leading-normal text-muted-foreground">
							{t('settings.appTheme.description')}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Select value={activeThemeId} onValueChange={handleThemeStyleChange}>
							<SelectTrigger
								className="w-32 h-8 text-sm"
								aria-label={t('settings.appTheme.title')}
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={DEFAULT_THEME_ID}>
									{t('settings.appTheme.default')}
								</SelectItem>
								{customThemes.map((ct) => (
									<SelectItem key={ct.id} value={ct.id}>
										{ct.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				<div className="flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm">
					<div className="flex flex-1 flex-col gap-1">
						<h3 className="text-sm leading-snug font-medium">{t('settings.language.title')}</h3>
						<p className="text-sm leading-normal text-muted-foreground">
							{t('settings.language.description')}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Select value={language} onValueChange={handleLanguageChange}>
							<SelectTrigger
								className="w-32 h-8 text-sm"
								aria-label={t('settings.language.title')}
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{LANGUAGE_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{t(option.labelKey)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SystemPage;
