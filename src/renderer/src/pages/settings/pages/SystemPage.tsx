import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Moon, Monitor, SlidersHorizontal, Sun, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Card, CardContent } from '@/components/ui/card';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { AppLanguage } from '../../../contexts';
import { useApp } from '@/contexts';
import type { ThemeMode, ThemeVariant } from '../../../../../shared';

function Row({
	icon: Icon,
	title,
	description,
	children,
}: {
	readonly icon?: LucideIcon;
	readonly title: ReactNode;
	readonly description?: ReactNode;
	readonly children?: ReactNode;
}): React.JSX.Element {
	return (
		<div className="grid min-h-[44px] grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border/70 px-3 py-2 last:border-b-0">
			<div className="flex min-w-0 items-start gap-2">
				{Icon && (
					<div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted/60 text-muted-foreground">
						<Icon className="size-3.5" />
					</div>
				)}
				<div className="min-w-0 flex-1">
					<div className="text-[13px] font-medium leading-tight text-foreground">{title}</div>
					{description && (
						<p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{description}</p>
					)}
				</div>
			</div>
			{children && (
				<div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">{children}</div>
			)}
		</div>
	);
}

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
		(event: React.ChangeEvent<HTMLInputElement>): void => {
			setTranslucency(mode, Number(event.currentTarget.value));
		};

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-3 pb-3">
			<header className="flex flex-wrap items-start justify-between gap-3 pb-1">
				<div className="min-w-0">
					<h1 className="text-2xl font-semibold leading-tight tracking-normal">
						{t('settings.tabs.system')}
					</h1>
					<p className="mt-1 max-w-2xl text-sm leading-snug text-muted-foreground">
						{t('settings.sections.layout')}
					</p>
				</div>
			</header>

			<section className="flex flex-col gap-2">
				<h2 className="px-0.5 text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
					{t('settings.sections.layout')}
				</h2>
				<Card size="sm" className="gap-0 py-0">
					<CardContent className="p-0">
						<Row
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
											size="icon-xs"
											onClick={() => setTheme(value)}
											aria-label={option.label}
											aria-pressed={theme === value}
										>
											<Icon className="size-3" />
										</Button>
									);
								})}
							</ButtonGroup>
						</Row>
						<Row
							icon={Languages}
							title={t('settings.language.title')}
							description={t('settings.language.description')}
						>
							<Select value={language} onValueChange={handleLanguageChange}>
								<SelectTrigger
									className="w-32 text-xs"
									size="sm"
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
						</Row>
					</CardContent>
				</Card>
			</section>

			<section className="flex flex-col gap-2">
				<div className="px-0.5">
					<h2 className="text-[11px] font-semibold uppercase tracking-normal text-muted-foreground">
						{t('settings.translucency.title')}
					</h2>
					<p className="mt-0.5 max-w-2xl text-xs leading-snug text-muted-foreground">
						{t('settings.translucency.description')}
					</p>
				</div>
				<Card size="sm" className="gap-0 py-0">
					<CardContent className="p-0">
						{TRANSLUCENCY_OPTIONS.map((option) => {
							const Icon = option.icon;
							const value = translucency[option.value];
							return (
								<Row
									key={option.value}
									icon={Icon}
									title={t(option.labelKey)}
									description={t(option.descriptionKey)}
								>
									<div className={cn('flex w-56 min-w-0 items-center gap-2')}>
										<input
											type="range"
											min={0}
											max={100}
											step={1}
											value={value}
											onChange={handleTranslucencyChange(option.value)}
											aria-label={t(option.labelKey)}
											className="h-1.5 min-w-0 flex-1 cursor-pointer accent-primary"
										/>
										<span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
											{t('settings.translucency.value', { value })}
										</span>
									</div>
								</Row>
							);
						})}
					</CardContent>
				</Card>
			</section>
		</div>
	);
};

export default SystemPage;
