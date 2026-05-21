import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { getChannelCatalogEntry } from '../../../../../shared/channel-catalog';
import {
	DOCUMENT_READER_AGENT_ID,
	IMAGE_ASSISTANT_AGENT_ID,
	MUSIC_CREATOR_AGENT_ID,
	SPEECH_TRANSCRIBER_AGENT_ID,
	TEXT_TO_SPEECH_AGENT_ID,
	VIDEO_CREATOR_AGENT_ID,
} from '../../../../../shared/service';
import { SETTINGS_NAVIGATION } from '../navigation';

const CRON_TASK_OPERATOR_ID = 'cron-task';
const BACKGROUND_TASK_OPERATOR_ID = 'background-task';

interface SettingsBreadcrumbItem {
	readonly label: string;
	readonly path?: string;
}

export function useSettingsBreadcrumbItems(): readonly SettingsBreadcrumbItem[] {
	const { t } = useTranslation();
	const location = useLocation();
	const connectorDetailId = location.pathname.startsWith('/settings/connectors/connectordetails/')
		? decodeURIComponent(location.pathname.split('/').at(-1) ?? '')
		: null;
	const [connectorDetailName, setConnectorDetailName] = useState<string | null>(null);

	useEffect(() => {
		if (!connectorDetailId) {
			setConnectorDetailName(null);
			return;
		}

		let mounted = true;
		setConnectorDetailName(null);
		void window.connectors.get(connectorDetailId).then(
			(connector) => {
				if (mounted) setConnectorDetailName(connector.name);
			},
			() => {
				if (mounted) setConnectorDetailName(null);
			}
		);

		return () => {
			mounted = false;
		};
	}, [connectorDetailId]);

	if (location.pathname === '/settings') return [];

	const current = SETTINGS_NAVIGATION.find((item) => (
		location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
	));
	if (!current) return [];

	const items: SettingsBreadcrumbItem[] = [{ label: t(current.labelKey) }];

	if (location.pathname.startsWith('/settings/channels/channelDetail/')) {
		const channelId = decodeURIComponent(location.pathname.split('/').at(-1) ?? '');
		const channelLabel = getChannelCatalogEntry(channelId)?.label ?? channelId;
		items[0] = { ...items[0], path: current.path };
		items.push({ label: channelLabel });
	}

	if (location.pathname.startsWith('/settings/connectors/connectordetails/')) {
		items[0] = { ...items[0], path: current.path };
		items.push({ label: connectorDetailName ?? t('settings.connectors.detailsTitle') });
	}

	if (location.pathname.startsWith('/settings/skills/skilldetails/')) {
		const skillId = decodeURIComponent(location.pathname.split('/').at(-1) ?? '');
		items[0] = { ...items[0], path: current.path };
		items.push({ label: skillId });
	}

	if (location.pathname.startsWith('/settings/operators/')) {
		const parts = location.pathname.split('/');
		const operatorId = decodeURIComponent(parts[3] ?? '');
		const isChatHistoryPage = parts[5] === 'chathistory';
		items[0] = { ...items[0], path: current.path };
		const label = operatorId === 'friday' || operatorId === 'main'
			? t('settings.operators.fridayBreadcrumb')
			: operatorId === SPEECH_TRANSCRIBER_AGENT_ID
				? t('settings.operators.speechTranscriberName')
				: operatorId === TEXT_TO_SPEECH_AGENT_ID
					? t('settings.operators.textToSpeechName')
					: operatorId === IMAGE_ASSISTANT_AGENT_ID
						? t('settings.operators.imageAssistantName')
						: operatorId === VIDEO_CREATOR_AGENT_ID
							? t('settings.operators.videoCreatorName')
							: operatorId === MUSIC_CREATOR_AGENT_ID
								? t('settings.operators.musicCreatorName')
								: operatorId === DOCUMENT_READER_AGENT_ID
									? t('settings.operators.documentReaderName')
									: operatorId === CRON_TASK_OPERATOR_ID
										? t('settings.operators.cronTaskName')
										: operatorId === BACKGROUND_TASK_OPERATOR_ID
											? t('settings.operators.backgroundTaskName')
											: operatorId;
		items.push({
			label,
			path: isChatHistoryPage ? `/settings/operators/${encodeURIComponent(operatorId)}/details` : undefined,
		});
		if (isChatHistoryPage) {
			items.push({ label: t('settings.operators.history') });
		}
	}

	if (location.pathname.startsWith('/settings/cron/crondetails/')) {
		items[0] = { ...items[0], path: current.path };
		items.push({ label: t('settings.cron.detailsTitle') });
	}

	if (location.pathname.startsWith('/settings/task-manager/taskdetails/')) {
		items[0] = { ...items[0], path: current.path };
		items.push({ label: t('settings.taskManager.detailsTitle') });
	}

	return items;
}
