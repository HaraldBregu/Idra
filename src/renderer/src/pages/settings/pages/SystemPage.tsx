import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Moon, Monitor, SlidersHorizontal, Sun } from 'lucide-react';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import type { AppLanguage } from '../../../contexts';
import { useApp } from '@/contexts';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsRow,
	SettingsSection,
} from '../components';
import type { ThemeMode } from '../../../../../shared';

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

	const handleLanguageChange = (next: string | null): void => {
		if (next === null) return;
		const option = LANGUAGE_OPTIONS.find((o) => o.value === next);
		if (option) setLanguage(option.value);
	};

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				icon={SlidersHorizontal}
				title={t('settings.tabs.system')}
				description={t('settings.sections.layout')}
			/>

			<SettingsSection title={t('settings.sections.layout')}>
				<SettingsPanel>
					<SettingsRow
						icon={Monitor}
						title={t('settings.theme.title')}
						description={t('settings.theme.description')}
					>
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
										size="icon-sm"
										onClick={() => setTheme(value)}
										aria-label={option.label}
										aria-pressed={theme === value}
									>
										<Icon className="size-3.5" />
									</Button>
								);
							})}
						</ButtonGroup>
					</SettingsRow>
					<SettingsRow
						icon={Languages}
						title={t('settings.language.title')}
						description={t('settings.language.description')}
					>
						<Select value={language} onValueChange={handleLanguageChange}>
							<SelectTrigger className="w-36" size="sm" aria-label={t('settings.language.title')}>
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
					</SettingsRow>
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default SystemPage;
