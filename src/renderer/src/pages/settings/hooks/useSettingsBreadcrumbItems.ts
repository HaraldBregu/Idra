import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { getChannelCatalogEntry } from '../../../../../shared/channels';
import {
	getConnectorCatalogItem,
	isOpenAiConnectorId,
} from '../../../../../shared/connector';
import {
	IMAGE_CREATOR_OPERATOR_ID,
	MUSIC_CREATOR_OPERATOR_ID,
	SPEECH_TO_TEXT_OPERATOR_ID,
	TEXT_TO_SPEECH_OPERATOR_ID,
	TEXT_TO_VIDEO_OPERATOR_ID,
} from '../../../../../shared/agents/service';
import { SETTINGS_NAVIGATION } from '../navigation';

interface SettingsBreadcrumbItem {
	readonly label: string;
	readonly path?: string;
}

function getFileLabelFromSearch(search: string): string | null {
	const filePath = new URLSearchParams(search).get('path')?.trim();
	if (!filePath) return null;
	const normalized = filePath.replace(/\\/g, '/');
	const parts = normalized.split('/').filter(Boolean);
	return parts[parts.length - 1] ?? filePath;
}

export function useSettingsBreadcrumbItems(): readonly SettingsBreadcrumbItem[] {
	const { t } = useTranslation();
	const location = useLocation();
	const connectorDetailId = location.pathname.startsWith('/settings/connectors/connectordetails/')
		? decodeURIComponent(location.pathname.split('/').at(-1) ?? '')
		: null;
	const connectorCatalogId = location.pathname.startsWith('/settings/connectors/configure/')
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

	if (location.pathname.startsWith('/settings/operators/')) {
		const parts = location.pathname.split('/');
		const operatorId = decodeURIComponent(parts[3] ?? '');
		const isChatHistoryPage = parts[5] === 'chathistory';
		const label = operatorId === 'friday' || operatorId === 'main'
			? t('settings.operators.fridayBreadcrumb')
			: operatorId === SPEECH_TO_TEXT_OPERATOR_ID
				? t('settings.operators.speechTranscriberName')
				: operatorId === TEXT_TO_SPEECH_OPERATOR_ID
					? t('settings.operators.textToSpeechName')
					: operatorId === IMAGE_CREATOR_OPERATOR_ID
						? t('settings.operators.imageAssistantName')
						: operatorId === TEXT_TO_VIDEO_OPERATOR_ID
							? t('settings.operators.videoCreatorName')
							: operatorId === MUSIC_CREATOR_OPERATOR_ID
								? t('settings.operators.musicCreatorName')
								: operatorId;
		const items: SettingsBreadcrumbItem[] = [{
			label,
			path: isChatHistoryPage ? `/settings/operators/${encodeURIComponent(operatorId)}/details` : undefined,
		}];
		if (isChatHistoryPage) {
			items.push({ label: t('settings.operators.history') });
		}
		return items;
	}

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

	if (location.pathname.startsWith('/settings/connectors/configure/')) {
		const connectorName = connectorCatalogId && isOpenAiConnectorId(connectorCatalogId)
			? getConnectorCatalogItem(connectorCatalogId)?.name
			: null;
		items[0] = { ...items[0], path: current.path };
		items.push({ label: connectorName ?? t('settings.connectors.detailsTitle') });
	}

	if (location.pathname.startsWith('/settings/skills/skilldetails/')) {
		const skillId = decodeURIComponent(location.pathname.split('/').at(-1) ?? '');
		items[0] = { ...items[0], path: current.path };
		items.push({ label: skillId });
	}

	if (location.pathname.startsWith('/settings/cron/crondetails/')) {
		items[0] = { ...items[0], path: current.path };
		items.push({ label: t('settings.cron.detailsTitle') });
	}

	if (location.pathname.startsWith('/settings/task-manager/taskdetails/')) {
		items[0] = { ...items[0], path: current.path };
		items.push({ label: t('settings.taskManager.detailsTitle') });
	}

	if (
		location.pathname.startsWith('/settings/memory/details') ||
		location.pathname.startsWith('/settings/rag/details') ||
		location.pathname.startsWith('/settings/wiki/details')
	) {
		items[0] = { ...items[0], path: current.path };
		items.push({ label: getFileLabelFromSearch(location.search) ?? t('settings.memory.detailsTitle') });
	}

	return items;
}
