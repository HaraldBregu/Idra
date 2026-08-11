import type { ReactElement } from 'react';
import { Blocks, Bot, Info, MonitorCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface SettingsButtonsProps {
	readonly onNavigate: () => void;
}

export function SettingsButtons({ onNavigate }: SettingsButtonsProps): ReactElement {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const settingsLabel = t('settings.title', 'Settings');

	return (
		<div className="flex items-center gap-1" aria-label={settingsLabel}>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-full"
				title={t('settings.tabs.general')}
				aria-label={t('settings.tabs.general')}
				onClick={() => {
					onNavigate();
					navigate('/settings/general');
				}}
			>
				<Info />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-full"
				title={t('settings.overview.groups.agent')}
				aria-label={t('settings.overview.groups.agent')}
				onClick={() => {
					onNavigate();
					navigate('/settings/assistant');
				}}
			>
				<Bot />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-full"
				title={t('settings.tabs.system')}
				aria-label={t('settings.tabs.system')}
				onClick={() => {
					onNavigate();
					navigate('/settings/system');
				}}
			>
				<MonitorCog />
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				className="size-8 rounded-full"
				title={t('settings.tabs.extensions')}
				aria-label={t('settings.tabs.extensions')}
				onClick={() => {
					onNavigate();
					navigate('/settings/extensions');
				}}
			>
				<Blocks />
			</Button>
		</div>
	);
}
