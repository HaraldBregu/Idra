import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/Switch';

const DeveloperPage: React.FC = () => {
	const { t } = useTranslation();
	const [developerMode, setDeveloperMode] = useState(false);

	const handleToggle = useCallback((checked: boolean) => {
		setDeveloperMode(checked);
	}, []);

	return (
		<div className="w-full">
			<h1 className="text-lg font-normal mb-2">{t('settings.tabs.developer')}</h1>

			<div className="pt-0 pb-2">
				<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					{t('settings.sections.developer')}
				</h2>
			</div>

			<div className="flex flex-col gap-2">
				<div className="flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm">
					<div className="flex flex-1 flex-col gap-1">
						<h3 className="text-sm leading-snug font-medium">{t('settings.developer.mode')}</h3>
						<p className="text-sm leading-normal text-muted-foreground">
							{t('settings.developer.modeDescription')}
						</p>
					</div>
					<div className="flex items-center gap-2">
						<Switch checked={developerMode} onCheckedChange={handleToggle} />
					</div>
				</div>
			</div>
		</div>
	);
};

export default DeveloperPage;
