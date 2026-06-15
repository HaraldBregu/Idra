import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
import { AGENTS, type AgentId } from '@/lib/compat';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import {
	SETTINGS_NAVIGATION,
	SETTINGS_MODEL_SERVICE_ITEMS,
	type SettingsNavigationItem,
	type SettingsModelServiceItem,
} from '../../navigation';

const SETTINGS_OVERVIEW_GROUPS = [
	{
		id: 'app',
		titleKey: 'settings.overview.groups.app',
		paths: ['/settings/general', '/settings/system', '/settings/providers'],
	},
	{
		id: 'agent',
		titleKey: 'settings.overview.groups.agent',
		agentIds: [AGENTS.assistant],
		paths: ['/settings/skills'],
	},
	{
		id: 'connectors',
		titleKey: 'settings.overview.groups.connectors',
		paths: ['/settings/connectors', '/settings/mcp'],
	},
	{
		id: 'modelServices',
		titleKey: 'settings.overview.groups.modelServices',
		agentIds: [
			AGENTS.speechToText,
			AGENTS.textToSpeech,
			AGENTS.textToImage,
			AGENTS.textToVideo,
			AGENTS.textToAudio,
		],
		paths: [],
	},
	{
		id: 'channels',
		titleKey: 'settings.overview.groups.channels',
		paths: ['/settings/channels'],
	},
	{
		id: 'automation',
		titleKey: 'settings.overview.groups.automation',
		paths: ['/settings/cron'],
	},
] satisfies readonly {
	readonly id: string;
	readonly titleKey?: string;
	readonly agentIds?: readonly SettingsOverviewAgentId[];
	readonly paths: readonly string[];
}[];

function getSettingsNavigationItem(path: string): SettingsNavigationItem {
	return SETTINGS_NAVIGATION.find((item) => item.path === path)!;
}

const SETTINGS_OVERVIEW_AGENT_IDS = [
	AGENTS.assistant,
	AGENTS.speechToText,
	AGENTS.textToSpeech,
	AGENTS.textToImage,
	AGENTS.textToVideo,
	AGENTS.textToAudio,
] as const satisfies readonly AgentId[];

type SettingsOverviewAgentId = (typeof SETTINGS_OVERVIEW_AGENT_IDS)[number];
type SettingsOverviewAgentItem = Omit<SettingsModelServiceItem, 'id'> & {
	readonly id: SettingsOverviewAgentId;
};

const MODEL_SERVICE_ROUTE_IDS_BY_AGENT_ID = {
	[AGENTS.assistant]: AGENTS.assistant,
	[AGENTS.speechToText]: AGENTS.speechToText,
	[AGENTS.textToSpeech]: AGENTS.textToSpeech,
	[AGENTS.textToImage]: AGENTS.textToImage,
	[AGENTS.textToVideo]: AGENTS.textToVideo,
	[AGENTS.textToAudio]: AGENTS.textToAudio,
} as const satisfies Record<SettingsOverviewAgentId, string>;

function getSettingsOverviewAgentItem(agentId: SettingsOverviewAgentId): SettingsOverviewAgentItem {
	const routeId = MODEL_SERVICE_ROUTE_IDS_BY_AGENT_ID[agentId];
	const path = `/settings/model-services/${routeId}/details`;
	const item = SETTINGS_MODEL_SERVICE_ITEMS.find((serviceItem) => serviceItem.path === path);
	if (!item) throw new Error(`Missing settings overview agent route: ${path}`);
	return { ...item, id: agentId };
}

function SettingsOverviewCard({
	item,
	badge,
	disabled = false,
}: {
	readonly item: SettingsNavigationItem | SettingsModelServiceItem;
	readonly badge?: React.ReactNode;
	readonly disabled?: boolean;
}): React.JSX.Element {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const unavailable = disabled || ('comingSoon' in item && item.comingSoon === true);
	const handleActivate = (): void => {
		if (unavailable) return;
		navigate(item.path);
	};

	return (
		<Item
			as="button"
			type="button"
			onClick={handleActivate}
			variant="outline"
			size="md"
			disabled={unavailable}
			className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center border-b border-border/30 px-4 text-left last:border-b-0 disabled:cursor-default disabled:opacity-60"
		>
			<ItemIcon icon={item.icon} className="size-7 [&_svg]:size-3.5" />
			<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
				<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal text-muted-foreground">
					{t(item.labelKey)}
				</ItemTitle>
				{'descriptionKey' in item && item.descriptionKey && (
					<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground/50">
						{t(item.descriptionKey)}
					</p>
				)}
			</ItemContent>
			<ItemActions className="ml-0 flex-none justify-end">
				{badge}
				{unavailable ? (
					<Badge variant="secondary" className="text-[10px] leading-none">
						Soon
					</Badge>
				) : (
					<ChevronRight className="size-3 shrink-0 text-muted-foreground/40" strokeWidth={1.8} />
				)}
			</ItemActions>
		</Item>
	);
}

const OverviewPage: React.FC = () => {
	const { t } = useTranslation();
	const disabledOverviewPaths = new Set(['/settings/skills']);

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={t('settings.title')} description={t('settings.description')} />
			{SETTINGS_OVERVIEW_GROUPS.map((group) => {
				const panel = (
					<SettingsPanel>
						{group.agentIds?.map((agentId) => {
							const item = getSettingsOverviewAgentItem(agentId);
							return <SettingsOverviewCard key={item.path} item={item} />;
						})}
						{group.paths.map((path) => {
							const item = getSettingsNavigationItem(path);
							return (
								<SettingsOverviewCard
									key={item.path}
									item={item}
									disabled={disabledOverviewPaths.has(item.path)}
								/>
							);
						})}
					</SettingsPanel>
				);

				if (!group.titleKey) {
					return (
						<section key={group.id} className="flex flex-col gap-2">
							{panel}
						</section>
					);
				}

				return (
					<SettingsSection key={group.id} hideTitle={group.id === 'app'} title={t(group.titleKey)}>
						{panel}
					</SettingsSection>
				);
			})}
		</SettingsPageShell>
	);
};

export default OverviewPage;
