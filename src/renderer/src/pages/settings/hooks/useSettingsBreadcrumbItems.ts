import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { getChannelCatalogEntry } from '../../../../../shared';
import { AGENTS } from '@/lib/compat';
import { SETTINGS_MODEL_SERVICE_ITEMS, SETTINGS_NAVIGATION } from '../navigation';

interface SettingsBreadcrumbItem {
	readonly label: string;
	readonly path?: string;
}

export function useSettingsBreadcrumbItems(): readonly SettingsBreadcrumbItem[] {
	const { t } = useTranslation();
	const location = useLocation();
	const mcpServerDetailId = location.pathname.startsWith('/settings/mcp/details/')
		? decodeURIComponent(location.pathname.split('/').at(-1) ?? '')
		: null;
	const [mcpServerDetailName, setMcpServerDetailName] = useState<string | null>(null);

	useEffect(() => {
		if (!mcpServerDetailId) {
			setMcpServerDetailName(null);
			return;
		}

		let mounted = true;
		setMcpServerDetailName(null);
		void window.agent.mcpList().then(
			() => {
				if (mounted) setMcpServerDetailName(mcpServerDetailId);
			},
			() => {
				if (mounted) setMcpServerDetailName(null);
			}
		);

		return () => {
			mounted = false;
		};
	}, [mcpServerDetailId]);

	if (location.pathname === '/settings') return [];

	if (location.pathname.startsWith('/settings/model-services/')) {
		const parts = location.pathname.split('/');
		const serviceId = decodeURIComponent(parts[3] ?? '');
		const isChatHistoryPage = parts[5] === 'chathistory';
		const normalizedServiceId = serviceId === 'friday' || serviceId === 'main'
			? AGENTS.assistant
			: serviceId;
		const serviceItem = SETTINGS_MODEL_SERVICE_ITEMS.find(
			(item) => item.id === normalizedServiceId
		);
		const label = serviceItem ? t(serviceItem.labelKey) : serviceId;
		const items: SettingsBreadcrumbItem[] = [{
			label,
			path: isChatHistoryPage ? `/settings/model-services/${encodeURIComponent(serviceId)}/details` : undefined,
		}];
		if (isChatHistoryPage) {
			items.push({ label: t('settings.modelServices.history') });
		}
		return items;
	}

	const serviceItem = SETTINGS_MODEL_SERVICE_ITEMS.find(
		(item) => item.path === location.pathname
	);
	if (serviceItem) return [{ label: t(serviceItem.labelKey) }];

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

	if (location.pathname.startsWith('/settings/mcp/details/')) {
		items[0] = { ...items[0], path: current.path };
		items.push({ label: mcpServerDetailName ?? t('settings.mcp.detailsTitle') });
	}

	if (location.pathname.startsWith('/settings/skills/skilldetails/')) {
		const skillId = decodeURIComponent(location.pathname.split('/').at(-1) ?? '');
		items[0] = { ...items[0], path: current.path };
		items.push({ label: skillId });
	}

	return items;
}
