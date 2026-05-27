import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
import { AGENTS, type AgentId } from '../../../../../../shared/agents';
import {
	ASSISTANT_OPERATOR_ID,
	IMAGE_CREATOR_OPERATOR_ID,
	MUSIC_CREATOR_OPERATOR_ID,
} from '../../../../../../shared/agents/service';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import {
	SETTINGS_NAVIGATION,
	SETTINGS_OPERATOR_ITEMS,
	type SettingsNavigationItem,
	type SettingsOperatorItem,
} from '../../navigation';


const SETTINGS_OVERVIEW_GROUPS = [
	{
		id: 'app',
		titleKey: 'settings.overview.groups.app',
		paths: ['/settings/general', '/settings/system'],
	},
	{
		id: 'ai',
		titleKey: 'settings.overview.groups.ai',
		agents: true,
		paths: ['/settings/providers', '/settings/skills', '/settings/connectors'],
	},
	{
		id: 'channels',
		titleKey: 'settings.overview.groups.channels',
		paths: ['/settings/channels'],
	},
	{
		id: 'automation',
		titleKey: 'settings.overview.groups.automation',
		paths: ['/settings/heartbeat', '/settings/cron'],
	},
	{
		id: 'monitoring',
		titleKey: 'settings.overview.groups.monitoring',
		paths: ['/settings/task-manager', '/settings/monitoring', '/settings/policies'],
	},
] satisfies readonly {
	readonly id: string;
	readonly titleKey?: string;
	readonly agents?: boolean;
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
type SettingsOverviewAgentItem = Omit<SettingsOperatorItem, 'id'> & {
	readonly id: SettingsOverviewAgentId;
};

const OPERATOR_ROUTE_IDS_BY_AGENT_ID = {
	[AGENTS.assistant]: ASSISTANT_OPERATOR_ID,
	[AGENTS.speechToText]: AGENTS.speechToText,
	[AGENTS.textToSpeech]: AGENTS.textToSpeech,
	[AGENTS.textToImage]: IMAGE_CREATOR_OPERATOR_ID,
	[AGENTS.textToVideo]: AGENTS.textToVideo,
	[AGENTS.textToAudio]: MUSIC_CREATOR_OPERATOR_ID,
} as const satisfies Record<SettingsOverviewAgentId, string>;

function getSettingsOverviewAgentItem(agentId: SettingsOverviewAgentId): SettingsOverviewAgentItem {
	const routeId = OPERATOR_ROUTE_IDS_BY_AGENT_ID[agentId];
	const path = `/settings/operators/${routeId}/details`;
	const item = SETTINGS_OPERATOR_ITEMS.find((operatorItem) => operatorItem.path === path);
	if (!item) throw new Error(`Missing settings overview agent route: ${path}`);
	return { ...item, id: agentId };
}

const SETTINGS_OVERVIEW_AGENT_ITEMS = SETTINGS_OVERVIEW_AGENT_IDS.map(
	getSettingsOverviewAgentItem
);

function SettingsOverviewCard({
	item,
	badge,
}: {
	readonly item: SettingsNavigationItem | SettingsOperatorItem;
	readonly badge?: React.ReactNode;
}): React.JSX.Element {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const comingSoon = 'comingSoon' in item && item.comingSoon === true;
	const handleActivate = (): void => {
		if (comingSoon) return;
		navigate(item.path);
	};

	return (
		<Item
			as="button"
			type="button"
			onClick={handleActivate}
			variant="outline"
			size="md"
			disabled={comingSoon}
			className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center border-b border-border/30 px-4 text-left last:border-b-0 disabled:cursor-default disabled:opacity-60"
		>
			<ItemIcon icon={item.icon} />
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
				{comingSoon ? (
					<Badge variant="secondary" className="text-[10px] leading-none">
						Soon
					</Badge>
				) : (
					<ChevronRight
						className="size-3 shrink-0 text-muted-foreground/40"
						strokeWidth={1.8}
					/>
				)}
			</ItemActions>
		</Item>
	);
}

const OverviewPage: React.FC = () => {
	const { t } = useTranslation();
	const [heartbeatEnabled, setHeartbeatEnabled] = useState<boolean | null>(null);

	useEffect(() => {
		void window.heartbeat.status().then((s) => setHeartbeatEnabled(s.enabled));
		return window.heartbeat.onEvent(() => {
			void window.heartbeat.status().then((s) => setHeartbeatEnabled(s.enabled));
		});
	}, []);

	return (
		<SettingsPageShell className="px-6">
				<SettingsPageHeader
					title={t('settings.title')}
					description={t('settings.description')}
				/>
				{SETTINGS_OVERVIEW_GROUPS.map((group) => {
					const panel = (
						<SettingsPanel>
							{group.agents && SETTINGS_OVERVIEW_AGENT_ITEMS.map((item) => (
								<SettingsOverviewCard key={item.path} item={item} />
							))}
							{group.paths.map((path) => {
								const item = getSettingsNavigationItem(path);
								const badge =
									path === '/settings/heartbeat' && heartbeatEnabled !== null ? (
										<Badge
											variant={heartbeatEnabled ? 'outline' : 'secondary'}
											className="h-5 rounded-md px-1.5 text-[10px]"
										>
											{t(
												heartbeatEnabled
													? 'settings.heartbeat.values.enabled'
													: 'settings.heartbeat.values.paused'
											)}
										</Badge>
									) : undefined;
								return <SettingsOverviewCard key={item.path} item={item} badge={badge} />;
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
						<SettingsSection key={group.id} title={t(group.titleKey)}>
							{panel}
						</SettingsSection>
					);
				})}
			</SettingsPageShell>
		);
	};

export default OverviewPage;
