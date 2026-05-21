import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	FolderOpen,
	Languages,
	Monitor,
	Moon,
	PanelTop,
	Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card } from '@/components/ui/card';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { SettingsPageHeader, SettingsPageShell, SettingsSection } from '../../components';
import { Switch } from '@/components/ui/switch';
import { useApp, type AppLanguage } from '@/contexts';
import type { ThemeMode, ThemeVariant } from '../../../../../../shared';

interface LanguageOption {
	readonly value: AppLanguage;
	readonly labelKey: string;
}

const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
	{ value: 'en', labelKey: 'settings.language.en' },
	{ value: 'it', labelKey: 'settings.language.it' },
] as const;

const TRANSLUCENCY_OPTIONS = [
	{
		value: 'light',
		labelKey: 'settings.translucency.light',
		descriptionKey: 'settings.translucency.lightDescription',
		icon: Sun,
	},
	{
		value: 'dark',
		labelKey: 'settings.translucency.dark',
		descriptionKey: 'settings.translucency.darkDescription',
		icon: Moon,
	},
] satisfies readonly {
	readonly value: ThemeVariant;
	readonly labelKey: string;
	readonly descriptionKey: string;
	readonly icon: typeof Sun;
}[];

const GeneralPage: React.FC = () => {
	const { t } = useTranslation();
	const { theme, translucency, language, setTheme, setTranslucency, setLanguage } = useApp();
	const [trayEnabled, setTrayEnabled] = useState(true);

	useEffect(() => {
		void window.app.getTrayEnabled().then(setTrayEnabled);
	}, []);

	const handleTrayToggle = useCallback((checked: boolean) => {
		setTrayEnabled(checked);
		void window.app.setTrayEnabled(checked);
	}, []);

	const handleOpenAppDataFolder = useCallback(() => {
		void window.app.openAppDataFolder();
	}, []);

	const handleOpenUserDataFolder = useCallback(() => {
		void window.app.openUserDataFolder();
	}, []);

	const handleLanguageChange = (next: string | null): void => {
		if (next === null) return;
		const option = LANGUAGE_OPTIONS.find((o) => o.value === next);
		if (option) setLanguage(option.value);
	};

	const handleTranslucencyChange =
		(mode: ThemeVariant) =>
		(values: number[]): void => {
			setTranslucency(mode, values[0] ?? 0);
		};

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={t('settings.tabs.general')} />

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
							<ItemTitle>{t('settings.application.description')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<span className="text-[13px] text-foreground">{__APP_DESCRIPTION__}</span>
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
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<FolderOpen className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.application.userData')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<Button variant="outline" size="xs" onClick={handleOpenUserDataFolder}>
								{t('settings.application.openUserData')}
							</Button>
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>

			<SettingsSection title={t('settings.sections.layout')}>
				<Card size="sm" className="gap-0! p-0!">
					<Item variant="outline" size="md" className="border-b border-border/60">
						<ItemMedia variant="icon">
							<Monitor className="size-3" strokeWidth={1.8} />
						</ItemMedia>
						<ItemContent>
							<ItemTitle>{t('settings.theme.title')}</ItemTitle>
						</ItemContent>
						<ItemActions className="ml-auto flex-none justify-end">
							<ButtonGroup>
								{[
									{ value: 'light', label: t('settings.theme.light'), icon: Sun },
									{ value: 'system', label: t('settings.theme.system'), icon: Monitor },
									{ value: 'dark', label: t('settings.theme.dark'), icon: Moon },
								].map((option) => {
									const Icon = option.icon;
									const value = option.value as ThemeMode;
									return (
										<Button
											key={option.value}
											variant={theme === value ? 'secondary' : 'outline'}
											size="icon-xs"
											onClick={() => setTheme(value)}
											aria-label={option.label}
											aria-pressed={theme === value}
											title={option.label}
										>
											<Icon className="size-3" />
										</Button>
									);
								})}
							</ButtonGroup>
						</ItemActions>
					</Item>
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
									className="w-36 text-xs [&_svg]:size-3"
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
						</ItemActions>
					</Item>
				</Card>
			</SettingsSection>

			<SettingsSection
				title={t('settings.translucency.title')}
				description={t('settings.translucency.description')}
			>
				<Card size="sm" className="gap-0! p-0!">
					{TRANSLUCENCY_OPTIONS.map((option) => {
						const Icon = option.icon;
						const value = translucency[option.value];
						return (
							<Item key={option.value} variant="outline" size="md" className="border-b border-border/60">
								<ItemMedia variant="icon">
									<Icon className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>{t(option.labelKey)}</ItemTitle>
								</ItemContent>
								<ItemActions className="ml-auto flex-none justify-end gap-3">
									<Slider
										min={0}
										max={100}
										step={1}
										value={[value]}
										onValueChange={handleTranslucencyChange(option.value)}
										aria-label={t(option.labelKey)}
										className="w-40 sm:w-56"
									/>
									<span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
										{t('settings.translucency.value', { value })}
									</span>
								</ItemActions>
							</Item>
						);
					})}
				</Card>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default GeneralPage;
