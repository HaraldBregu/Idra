import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';

const DeveloperPage: React.FC = () => {
	const { t } = useTranslation();
	const [developerMode, setDeveloperMode] = useState(false);
	const rowClass =
		'flex min-h-[48px] w-full flex-wrap items-center gap-3 border-b border-border/70 px-6 py-1.5 text-sm last:border-b-0';
	const contentClass = 'flex min-w-0 flex-1 flex-col gap-1';
	const titleClass = 'text-sm leading-snug font-semibold';
	const descriptionClass = 'text-xs leading-normal text-muted-foreground';
	const actionsClass = 'ml-auto flex min-w-[180px] items-center justify-end gap-2 text-right';

	const handleToggle = useCallback((checked: boolean) => {
		setDeveloperMode(checked);
	}, []);

	return (
		<div className="w-full p-6">
			<section>
				<h2 className="mb-3 px-2 text-sm font-semibold text-muted-foreground">
					{t('settings.sections.developer')}
				</h2>

				<Card className="gap-0 py-0">
					<CardContent className="flex flex-col p-0">
						<div className={rowClass}>
							<div className={contentClass}>
								<h3 className={titleClass}>{t('settings.developer.mode')}</h3>
								<p className={descriptionClass}>{t('settings.developer.modeDescription')}</p>
							</div>
							<div className={actionsClass}>
								<Switch checked={developerMode} onCheckedChange={handleToggle} />
							</div>
						</div>
					</CardContent>
				</Card>
			</section>
		</div>
	);
};

export default DeveloperPage;
