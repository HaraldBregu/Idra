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

	if (location.pathname.startsWith('/settings/agents/')) {
		const parts = location.pathname.split('/');
		const agentId = decodeURIComponent(parts[3] ?? '');
		const isChatHistoryPage = parts[5] === 'chathistory';
		items[0] = { ...items[0], path: current.path };
		const label = agentId === 'friday' || agentId === 'main'
			? t('settings.agents.fridayBreadcrumb')
			: agentId === SPEECH_TRANSCRIBER_AGENT_ID
				? t('settings.agents.speechTranscriberName')
				: agentId === TEXT_TO_SPEECH_AGENT_ID
					? t('settings.agents.textToSpeechName')
					: agentId === IMAGE_ASSISTANT_AGENT_ID
						? t('settings.agents.imageAssistantName')
						: agentId === VIDEO_CREATOR_AGENT_ID
							? t('settings.agents.videoCreatorName')
							: agentId === MUSIC_CREATOR_AGENT_ID
								? t('settings.agents.musicCreatorName')
								: agentId === DOCUMENT_READER_AGENT_ID
									? t('settings.agents.documentReaderName')
									: agentId;
		items.push({
			label,
			path: isChatHistoryPage ? `/settings/agents/${encodeURIComponent(agentId)}/details` : undefined,
		});
		if (isChatHistoryPage) {
			items.push({ label: t('settings.agents.history') });
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
