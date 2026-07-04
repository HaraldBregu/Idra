import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AudioWaveform, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
import { AGENTS, type AgentId } from '@/lib/compat';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
} from '../../components';
import {
	SETTINGS_NAVIGATION,
	SETTINGS_MODEL_SERVICE_ITEMS,
	type SettingsNavigationItem,
	type SettingsModelServiceItem,
} from '../../navigation';

const SETTINGS_OVERVIEW_GROUPS = [
	{
		id: 'general',
		entries: [
			{ type: 'path', value: '/settings/application' },
			{ type: 'path', value: '/settings/providers' },
			{ type: 'path', value: '/settings/channels' },
		],
	},
	{
		id: 'primary',
		entries: [
			{ type: 'agent', value: AGENTS.assistant },
			{ type: 'path', value: '/settings/skills' },
			{ type: 'path', value: '/settings/mcp' },
			{ type: 'path', value: '/settings/tasks' },
			{ type: 'path', value: '/settings/tasks/health' },
		],
	},
	{
		id: 'modelServices',
		entries: [
			{ type: 'agent', value: AGENTS.speechToText },
			{ type: 'agent', value: AGENTS.textToSpeech },
			{ type: 'agent', value: AGENTS.textToImage },
		],
	},
] satisfies readonly {
	readonly id: string;
	readonly titleKey?: string;
	readonly entries: readonly (
		| { readonly type: 'path'; readonly value: string }
		| { readonly type: 'agent'; readonly value: SettingsOverviewAgentId }
	)[];
}[];

function getSettingsNavigationItem(path: string): SettingsNavigationItem {
	return SETTINGS_NAVIGATION.find((item) => item.path === path)!;
}

const _SETTINGS_OVERVIEW_AGENT_IDS = [
	AGENTS.assistant,
	AGENTS.speechToText,
	AGENTS.textToSpeech,
	AGENTS.textToImage,
	AGENTS.textToVideo,
	AGENTS.textToAudio,
] as const satisfies readonly AgentId[];

type SettingsOverviewAgentId = (typeof _SETTINGS_OVERVIEW_AGENT_IDS)[number];
type SettingsOverviewAgentItem = Omit<SettingsModelServiceItem, 'id'> & {
	readonly id: SettingsOverviewAgentId;
};

function getSettingsOverviewAgentItem(agentId: SettingsOverviewAgentId): SettingsOverviewAgentItem {
	const item = SETTINGS_MODEL_SERVICE_ITEMS.find((serviceItem) => serviceItem.id === agentId);
	if (!item) throw new Error(`Missing settings overview agent route: ${agentId}`);
	const icon = agentId === AGENTS.speechToText ? AudioWaveform : item.icon;
	return { ...item, id: agentId, icon };
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
			className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center border-b border-border/30 px-4 text-left last:border-b-0 disabled:cursor-default disabled:opacity-60"
		>
			<ItemIcon icon={item.icon} className="size-8 [&_svg]:size-4" />
			<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
				<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
					{t(item.labelKey)}
				</ItemTitle>
				{'descriptionKey' in item && item.descriptionKey && (
					<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground">
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
	const disabledOverviewPaths = new Set<string>([]);

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={t('settings.title')} description={t('settings.description')} />
			{SETTINGS_OVERVIEW_GROUPS.map((group) => {
			const panel = (
				<SettingsPanel>
					{group.entries.map((entry) => {
							const item = entry.type === 'agent'
								? getSettingsOverviewAgentItem(entry.value)
								: getSettingsNavigationItem(entry.value);
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

			return (
				<section key={group.id} className="flex flex-col gap-2">
					{panel}
				</section>
			);
		})}
		</SettingsPageShell>
	);
};

export default OverviewPage;
