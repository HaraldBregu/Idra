import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Moon, Monitor, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Slider } from '@/components/ui/slider';
import type { AppLanguage } from '../../../contexts';
import { useApp } from '@/contexts';
import type { ThemeMode, ThemeVariant } from '../../../../../shared';
import { SettingsPageHeader, SettingsPageShell, SettingsPanel, SettingsRow, SettingsSection } from '../components';

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

const SystemPage: React.FC = () => {
	const { t } = useTranslation();
	const { theme, translucency, language, setTheme, setTranslucency, setLanguage } = useApp();

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
			<SettingsPageHeader title={t('settings.tabs.system')} />

			<SettingsSection title={t('settings.sections.layout')}>
				<SettingsPanel>
					<SettingsRow
						icon={Monitor}
						title={t('settings.theme.title')}
						description={t('settings.theme.description')}
						actions={
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
						}
					/>
					<SettingsRow
						icon={Languages}
						title={t('settings.language.title')}
						description={t('settings.language.description')}
						actions={
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
						}
					/>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.translucency.title')}
				description={t('settings.translucency.description')}
			>
				<SettingsPanel>
					{TRANSLUCENCY_OPTIONS.map((option) => {
						const Icon = option.icon;
						const value = translucency[option.value];
						return (
							<Item key={option.value} variant="outline" size="sm" className="border-b border-border/60 last:border-b-0">
								<ItemMedia variant="icon">
									<Icon className="size-3" strokeWidth={1.8} />
								</ItemMedia>
								<ItemContent>
									<ItemTitle>{t(option.labelKey)}</ItemTitle>
								</ItemContent>
								<ItemActions className="gap-3">
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
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default SystemPage;
