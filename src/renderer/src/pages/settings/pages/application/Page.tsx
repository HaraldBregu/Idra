import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Coffee,
	FolderOpen,
	Languages,
	PanelTop,
	Search,
	SunMoon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useApp, type AppLanguage, type AppTheme } from '@/contexts';
import type { SearchEngineId, SearchSettings } from '../../../../../../shared/search_types';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsSection,
} from '../../components';
import { SEARCH_ENGINES } from '../search/catalog';

interface LanguageOption {
	readonly value: AppLanguage;
	readonly labelKey: string;
}

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
	{ value: 'en', labelKey: 'settings.language.en' },
	{ value: 'it', labelKey: 'settings.language.it' },
] as const;

interface ThemeOption {
	readonly value: AppTheme;
	readonly labelKey: string;
}

const THEME_OPTIONS: readonly ThemeOption[] = [
	{ value: 'light', labelKey: 'settings.theme.light' },
	{ value: 'dark', labelKey: 'settings.theme.dark' },
	{ value: 'system', labelKey: 'settings.theme.system' },
] as const;

const ApplicationPage: React.FC = () => {
	const { t } = useTranslation();
	const { language, setLanguage, theme, setTheme } = useApp();
	const [trayEnabled, setTrayEnabled] = useState(true);
	const [keepAwake, setKeepAwake] = useState(false);
	const [searchSettings, setSearchSettings] = useState<SearchSettings | null>(null);

	useEffect(() => {
		void window.app.getTrayEnabled().then(setTrayEnabled);
		void window.app.getKeepAwake().then(setKeepAwake);
		void window.search.getSettings().then(setSearchSettings);
	}, []);

	const handleTrayToggle = useCallback((checked: boolean) => {
		setTrayEnabled(checked);
		void window.app.setTrayEnabled(checked);
	}, []);

	const handleKeepAwakeToggle = useCallback((checked: boolean) => {
		setKeepAwake(checked);
		void window.app.setKeepAwake(checked);
	}, []);

	const handleOpenAppDataFolder = useCallback(() => {
		void window.app.openAppDataFolder();
	}, []);

	const handleLanguageChange = (next: string | null): void => {
		if (next === null) return;
		const option = LANGUAGE_OPTIONS.find((o) => o.value === next);
		if (option) setLanguage(option.value);
	};

	const handleThemeChange = (next: string | null): void => {
		if (next === null) return;
		const option = THEME_OPTIONS.find((o) => o.value === next);
		if (option) setTheme(option.value);
	};

	const handleSearchProviderChange = (next: string | null): void => {
		if (next === null) return;
		void window.search
			.selectEngine(next as SearchEngineId)
			.then(setSearchSettings)
			.catch(() => undefined);
	};

	const selectedSearchProvider = SEARCH_ENGINES.find(
		(engine) => engine.id === searchSettings?.engineId
	);

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={t('settings.tabs.application')} />

			<SettingsSection title={t('settings.application.information')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent>
							<ItemTitle>{t('settings.application.name')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="text-[13px] text-foreground">{__APP_NAME__}</span>
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemContent>
							<ItemTitle>{t('settings.application.version')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="font-mono text-[13px] text-foreground">{__APP_VERSION__}</span>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>

			<SettingsSection title={t('settings.application.actions')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<PanelTop className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.menuBar')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Switch checked={trayEnabled} onCheckedChange={handleTrayToggle} aria-label={t('settings.application.menuBar')} />
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<Coffee className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.keepAwake')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Switch checked={keepAwake} onCheckedChange={handleKeepAwakeToggle} aria-label={t('settings.application.keepAwake')} />
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<FolderOpen className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.appData')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Button variant="outline" size="xs" onClick={handleOpenAppDataFolder}>
								{t('settings.application.openAppData')}
							</Button>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>

			<SettingsSection title={t('settings.sections.layout')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<Languages className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.language.title')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Select value={language} onValueChange={handleLanguageChange}>
								<SelectTrigger
									size="sm"
									className="w-24 text-xs [&_svg]:size-3"
									aria-label={t('settings.language.title')}
								>
									<SelectValue>
										{t(LANGUAGE_OPTIONS.find((o) => o.value === language)?.labelKey ?? '')}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{LANGUAGE_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{t(option.labelKey)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</ItemActions>
					</Item>
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<SunMoon className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.theme.title')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Select value={theme} onValueChange={handleThemeChange}>
								<SelectTrigger
									size="sm"
									className="w-24 text-xs [&_svg]:size-3"
									aria-label={t('settings.theme.title')}
								>
									<SelectValue>
										{t(THEME_OPTIONS.find((o) => o.value === theme)?.labelKey ?? '')}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{THEME_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{t(option.labelKey)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>

			<SettingsSection title={t('settings.application.search')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<Search className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.searchEngine.defaultTitle')}</ItemTitle>
							<p className="text-xs text-muted-foreground">
								{t('settings.searchEngine.defaultDescription')}
							</p>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Select
								value={searchSettings?.engineId ?? null}
								onValueChange={handleSearchProviderChange}
								disabled={searchSettings === null}
							>
								<SelectTrigger
									size="sm"
									className="w-32 text-xs [&_svg]:size-3"
									aria-label={t('settings.searchEngine.defaultTitle')}
								>
									<SelectValue>{selectedSearchProvider?.name}</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{SEARCH_ENGINES.map((engine) => (
										<SelectItem
											key={engine.id}
											value={engine.id}
											disabled={!searchSettings?.configured[engine.id]}
										>
											{engine.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ApplicationPage;
