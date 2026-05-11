import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
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

	const rowClass =
		'flex min-h-[48px] w-full flex-wrap items-center gap-3 border-b border-border/70 px-6 py-1.5 text-sm last:border-b-0';
	const contentClass = 'flex min-w-0 flex-1 flex-col gap-1';
	const titleClass = 'text-sm leading-snug font-semibold';
	const descriptionClass = 'text-xs leading-normal text-muted-foreground';
	const actionsClass = 'ml-auto flex min-w-[180px] items-center justify-end gap-2 text-right';
	const valueClass =
		'max-w-[320px] truncate rounded-lg bg-muted/70 px-3 py-1.5 text-xs text-muted-foreground';

	return (
		<div className="flex w-full flex-col gap-5 p-6">
			<section>
				<h2 className="mb-3 px-2 text-sm font-semibold text-muted-foreground">
					{t('settings.application.information')}
				</h2>

				<Card className="gap-0 py-0">
					<CardContent className="flex flex-col p-0">
						<div className={rowClass}>
							<div className={contentClass}>
								<h3 className={titleClass}>{t('settings.application.name')}</h3>
							</div>
							<div className={actionsClass}>
								<span className={valueClass}>{__APP_NAME__}</span>
							</div>
						</div>

						<div className={rowClass}>
							<div className={contentClass}>
								<h3 className={titleClass}>{t('settings.application.description')}</h3>
							</div>
							<div className={actionsClass}>
								<span className={valueClass}>{__APP_DESCRIPTION__}</span>
							</div>
						</div>

						<div className={rowClass}>
							<div className={contentClass}>
								<h3 className={titleClass}>{t('settings.application.version')}</h3>
							</div>
							<div className={actionsClass}>
								<span className={`${valueClass} font-mono`}>{__APP_VERSION__}</span>
							</div>
						</div>

						<div className={rowClass}>
							<div className={contentClass}>
								<h3 className={titleClass}>{t('settings.application.author')}</h3>
							</div>
							<div className={actionsClass}>
								<span className={valueClass}>{__APP_AUTHOR__}</span>
							</div>
						</div>

						<div className={rowClass}>
							<div className={contentClass}>
								<h3 className={titleClass}>{t('settings.application.license')}</h3>
							</div>
							<div className={actionsClass}>
								<span className={valueClass}>{__APP_LICENSE__}</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</section>

			<section>
				<h2 className="mb-3 px-2 text-sm font-semibold text-muted-foreground">
					{t('settings.application.actions')}
				</h2>

				<Card className="gap-0 py-0">
					<CardContent className="flex flex-col p-0">
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
							<p className={descriptionClass}>{t('settings.application.menuBarDescription')}</p>
						</div>
						<div className={actionsClass}>
							<Switch checked={trayEnabled} onCheckedChange={handleTrayToggle} />
						</div>
					</div>

					<div className={rowClass}>
						<div className={contentClass}>
							<h3 className={titleClass}>{t('settings.application.appData')}</h3>
							<p className={descriptionClass}>{t('settings.application.appDataDescription')}</p>
						</div>
						<div className={actionsClass}>
							<Button variant="outline" size="sm" onClick={handleOpenAppDataFolder}>
								{t('settings.application.openAppData')}
							</Button>
						</div>
					</div>
				</CardContent>
				</Card>
			</section>
		</div>
	);
};

export default GeneralPage;
