import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';

const GeneralPage: React.FC = () => {
	const { t } = useTranslation();

	const [trayEnabled, setTrayEnabled] = useState(true);

	useEffect(() => {
		// window.app.getTrayEnabled().then(setTrayEnabled);
	}, []);

	const handleTrayToggle = useCallback((checked: boolean) => {
		setTrayEnabled(checked);
		// window.app.setTrayEnabled(checked);
	}, []);

	const handleOpenAccessibility = useCallback(() => {
		// window.app.openSystemAccessibility();
	}, []);

	const handleOpenScreenRecording = useCallback(() => {
		// window.app.openSystemScreenRecording();
	}, []);

	const handleOpenAppDataFolder = useCallback(() => {
		// window.app.openAppDataFolder();
	}, []);

	const rowClass = 'flex w-full flex-wrap items-center gap-2.5 border-b border-border py-2 text-sm';
	const contentClass = 'flex flex-1 flex-col gap-1';
	const titleClass = 'text-sm leading-snug font-medium';
	const descriptionClass = 'text-sm leading-normal text-muted-foreground';
	const actionsClass = 'flex items-center gap-2';

	return (
		<div className="w-full">
			<h1 className="text-lg font-normal mb-2">{t('settings.title')}</h1>

			<div className="pt-0 pb-2">
				<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
					{t('settings.sections.application')}
				</h2>
			</div>

			<div className="flex flex-col gap-2">
				<div className={rowClass}>
					<div className={contentClass}>
						<h3 className={titleClass}>{t('settings.application.name')}</h3>
					</div>
					<div className={actionsClass}>
						<span className="text-sm">{__APP_NAME__}</span>
					</div>
				</div>

				<div className={rowClass}>
					<div className={contentClass}>
						<h3 className={titleClass}>{t('settings.application.description')}</h3>
					</div>
					<div className={actionsClass}>
						<span className="text-sm text-muted-foreground">{__APP_DESCRIPTION__}</span>
					</div>
				</div>

				<div className={rowClass}>
					<div className={contentClass}>
						<h3 className={titleClass}>{t('settings.application.version')}</h3>
					</div>
					<div className={actionsClass}>
						<span className="font-mono text-sm">{__APP_VERSION__}</span>
					</div>
				</div>

				<div className={rowClass}>
					<div className={contentClass}>
						<h3 className={titleClass}>{t('settings.application.author')}</h3>
					</div>
					<div className={actionsClass}>
						<span className="text-sm">{__APP_AUTHOR__}</span>
					</div>
				</div>

				<div className={rowClass}>
					<div className={contentClass}>
						<h3 className={titleClass}>{t('settings.application.license')}</h3>
					</div>
					<div className={actionsClass}>
						<span className="text-sm">{__APP_LICENSE__}</span>
					</div>
				</div>

				<div className={rowClass}>
					<div className={contentClass}>
						<h3 className={titleClass}>{t('settings.application.accessibility')}</h3>
						<p className={descriptionClass}>
							{t('settings.application.accessibilityDescription')}
						</p>
					</div>
					<div className={actionsClass}>
						<Button variant="outline" size="sm" onClick={handleOpenAccessibility}>
							{t('settings.application.openAccessibility')}
						</Button>
					</div>
				</div>

				<div className={rowClass}>
					<div className={contentClass}>
						<h3 className={titleClass}>{t('settings.application.screenRecording')}</h3>
						<p className={descriptionClass}>
							{t('settings.application.screenRecordingDescription')}
						</p>
					</div>
					<div className={actionsClass}>
						<Button variant="outline" size="sm" onClick={handleOpenScreenRecording}>
							{t('settings.application.openScreenRecording')}
						</Button>
					</div>
				</div>

				<div className={rowClass}>
					<div className={contentClass}>
						<h3 className={titleClass}>{t('settings.application.menuBar')}</h3>
						<p className={descriptionClass}>
							{t('settings.application.menuBarDescription')}
						</p>
					</div>
					<div className={actionsClass}>
						<Switch checked={trayEnabled} onCheckedChange={handleTrayToggle} />
					</div>
				</div>

				<div className={rowClass}>
					<div className={contentClass}>
						<h3 className={titleClass}>{t('settings.application.appData')}</h3>
						<p className={descriptionClass}>
							{t('settings.application.appDataDescription')}
						</p>
					</div>
					<div className={actionsClass}>
						<Button variant="outline" size="sm" onClick={handleOpenAppDataFolder}>
							{t('settings.application.openAppData')}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default GeneralPage;
