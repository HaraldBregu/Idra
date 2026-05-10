import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Select,
	SelectTrigger,
	SelectValue,
	SelectContent,
	SelectItem,
} from '@/components/ui/Select';

interface FontOption {
	readonly value: string;
	readonly labelKey: string;
}

const FONT_OPTIONS: readonly FontOption[] = [
	{ value: 'default', labelKey: 'settings.editor.fontDefault' },
	{ value: 'sans-system', labelKey: 'settings.editor.fontSansSystem' },
	{ value: 'dyslexic-friendly', labelKey: 'settings.editor.fontDyslexicFriendly' },
] as const;

const EditorPage: React.FC = () => {
	const { t } = useTranslation();
	const [font, setFont] = useState('default');

	const handleFontChange = useCallback((next: string | null) => {
		if (next !== null) setFont(next);
	}, []);

	return (
		<div className="w-full">
			<h1 className="text-lg font-normal mb-6">{t('settings.tabs.editor')}</h1>

			<div className="pt-6 pb-2 first:pt-0">
				<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					{t('settings.sections.editor')}
				</h2>
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm">
					<div className="flex flex-1 flex-col gap-1">
						<h3 className="text-sm leading-snug font-medium">{t('settings.editor.font')}</h3>
						<p className="text-sm leading-normal text-muted-foreground">
							{t('settings.editor.fontDescription')}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Select value={font} onValueChange={handleFontChange}>
							<SelectTrigger
								className="w-44 h-8 text-sm"
								aria-label={t('settings.editor.font')}
							>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{FONT_OPTIONS.map((option) => (
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

export default EditorPage;
