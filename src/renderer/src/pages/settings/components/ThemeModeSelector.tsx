import React from 'react';
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Label } from '@/components/ui/Label';
import { useThemeMode } from '@/hooks/use-theme-mode';
import { useAppActions } from '@/hooks/use-app-actions';
import { ThemeMode } from '@shared';

export function ThemeModeSelector(): React.ReactElement {
	const themeMode = useThemeMode();
	const { setTheme } = useAppActions();
	const { t } = useTranslation();

	const themeOptions: ReadonlyArray<{ value: ThemeMode; label: string; description: string }> = [
		{
			value: 'light',
			label: t('settings.theme.light'),
			description: t('settings.theme.lightDescription'),
		},
		{
			value: 'dark',
			label: t('settings.theme.dark'),
			description: t('settings.theme.darkDescription'),
		},
		{
			value: 'system',
			label: t('settings.theme.system'),
			description: t('settings.theme.systemDescription'),
		},
	];

	return (
		<RadioGroup
			value={themeMode}
			onValueChange={(value) => setTheme(value as ThemeMode)}
			className="grid gap-0"
			aria-label={t('settings.theme.title')}
		>
			{themeOptions.map((option) => {
				const descriptionId = `theme-${option.value}-description`;
				return (
					<div key={option.value} className="flex items-center justify-between px-4 py-3">
						<div className="flex flex-col gap-0.5">
							<Label
								htmlFor={`theme-${option.value}`}
								className="text-sm font-normal cursor-pointer"
							>
								{option.label}
							</Label>
							<span id={descriptionId} className="text-xs text-muted-foreground">
								{option.description}
							</span>
						</div>
						<RadioGroupItem
							id={`theme-${option.value}`}
							value={option.value}
							aria-describedby={descriptionId}
						/>
					</div>
				);
			})}
		</RadioGroup>
	);
}
