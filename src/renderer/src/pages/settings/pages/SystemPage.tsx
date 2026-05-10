import React from 'react';
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
import { useApp } from '@/contexts';

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
	const { theme, language, setLanguage } = useApp();

	const handleLanguageChange = (next: string | null): void => {
		if (next === null) return;
		const option = LANGUAGE_OPTIONS.find((o) => o.value === next);
		if (option) setLanguage(option.value);
	};

	return (
		<div className="w-full">
			<h1 className="text-lg font-normal mb-2">{t('settings.tabs.system')}</h1>

			<div className="pt-0 pb-2">
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
								onClick={() => {}}
								aria-label={t('settings.theme.light')}
								aria-pressed={theme === 'light'}
							>
								<Sun className="size-3.5" />
							</Button>
							<Button
								variant={theme === 'system' ? 'outline-selected' : 'outline'}
								size="icon-sm"
								onClick={() => {}}
								aria-label={t('settings.theme.system')}
								aria-pressed={theme === 'system'}
							>
								<Monitor className="size-3.5" />
							</Button>
							<Button
								variant={theme === 'dark' ? 'outline-selected' : 'outline'}
								size="icon-sm"
								onClick={() => {}}
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
							<SelectTrigger className="w-32 h-8 text-sm" aria-label={t('settings.language.title')}>
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
