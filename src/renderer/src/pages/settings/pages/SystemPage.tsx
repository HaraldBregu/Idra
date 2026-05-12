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
import { Card, CardContent } from '@/components/ui/Card';
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
	const rowClass =
		'flex min-h-[48px] w-full flex-wrap items-center gap-3 border-b border-border/70 px-6 py-1.5 text-sm last:border-b-0';
	const contentClass = 'flex min-w-0 flex-1 flex-col gap-1';
	const titleClass = 'text-sm leading-snug font-semibold';
	const descriptionClass = 'text-xs leading-normal text-muted-foreground';
	const actionsClass = 'ml-auto flex min-w-[180px] items-center justify-end gap-2 text-right';

	const handleLanguageChange = (next: string | null): void => {
		if (next === null) return;
		const option = LANGUAGE_OPTIONS.find((o) => o.value === next);
		if (option) setLanguage(option.value);
	};

	return (
		<div className="w-full p-6">
			<section>
				<h2 className="mb-3 px-2 text-sm font-semibold text-muted-foreground">
					{t('settings.sections.layout')}
				</h2>

				<Card className="gap-0 py-0">
					<CardContent className="flex flex-col p-0">
						<div className={rowClass}>
							<div className={contentClass}>
								<h3 className={titleClass}>{t('settings.theme.title')}</h3>
								<p className={descriptionClass}>{t('settings.theme.description')}</p>
							</div>
							<div className={actionsClass}>
								<ButtonGroup>
									<Button
										variant={theme === 'light' ? 'secondary' : 'outline'}
										size="icon-sm"
										onClick={() => {}}
										aria-label={t('settings.theme.light')}
										aria-pressed={theme === 'light'}
									>
										<Sun className="size-3.5" />
									</Button>
									<Button
										variant={theme === 'system' ? 'secondary' : 'outline'}
										size="icon-sm"
										onClick={() => {}}
										aria-label={t('settings.theme.system')}
										aria-pressed={theme === 'system'}
									>
										<Monitor className="size-3.5" />
									</Button>
									<Button
										variant={theme === 'dark' ? 'secondary' : 'outline'}
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

						<div className={rowClass}>
							<div className={contentClass}>
								<h3 className={titleClass}>{t('settings.language.title')}</h3>
								<p className={descriptionClass}>{t('settings.language.description')}</p>
							</div>
							<div className={actionsClass}>
								<Select value={language} onValueChange={handleLanguageChange}>
									<SelectTrigger
										className="h-8 w-32 text-sm"
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
					</CardContent>
				</Card>
			</section>
		</div>
	);
};

export default SystemPage;
