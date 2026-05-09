import React from 'react';
import { useTranslation } from 'react-i18next';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Label } from '@/components/ui/Label';
import { useApp } from '@/contexts';
import type { AppLanguage } from '../../../contexts';

export function LanguageSelector(): React.ReactElement {
	const { language, setLanguage } = useApp();
	const { t } = useTranslation();

	const languageOptions: ReadonlyArray<{ value: AppLanguage; label: string; description: string }> =
		[
			{
				value: 'en',
				label: t('settings.language.en'),
				description: t('settings.language.enDescription'),
			},
			{
				value: 'it',
				label: t('settings.language.it'),
				description: t('settings.language.itDescription'),
			},
		];

	return (
		<RadioGroup
			value={language}
			onValueChange={(value) => setLanguage(value as AppLanguage)}
			className="grid gap-0"
			aria-label={t('settings.language.title')}
		>
			{languageOptions.map((option) => {
				const descriptionId = `language-${option.value}-description`;
				return (
					<div key={option.value} className="flex items-center justify-between px-4 py-3">
						<div className="flex flex-col gap-0.5">
							<Label
								htmlFor={`language-${option.value}`}
								className="text-sm font-normal cursor-pointer"
							>
								{option.label}
							</Label>
							<span id={descriptionId} className="text-xs text-muted-foreground">
								{option.description}
							</span>
						</div>
						<RadioGroupItem
							id={`language-${option.value}`}
							value={option.value}
							aria-describedby={descriptionId}
						/>
					</div>
				);
			})}
		</RadioGroup>
	);
}
