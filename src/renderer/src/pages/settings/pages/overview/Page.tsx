import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
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

const ICON_COLORS: Record<string, string> = {
	// General
	'/settings/general': '!bg-blue-500/15 !text-blue-600 dark:!text-blue-400',
	'/settings/system': '!bg-slate-500/15 !text-slate-600 dark:!text-slate-400',
	'/settings/providers': '!bg-purple-500/15 !text-purple-600 dark:!text-purple-400',
	'/settings/channels': '!bg-cyan-500/15 !text-cyan-600 dark:!text-cyan-400',
	// AI Features
	'/settings/skills': '!bg-amber-500/15 !text-amber-600 dark:!text-amber-400',
	'/settings/connectors': '!bg-green-500/15 !text-green-600 dark:!text-green-400',
	// Automations
	'/settings/heartbeat': '!bg-rose-500/15 !text-rose-600 dark:!text-rose-400',
	'/settings/cron': '!bg-orange-500/15 !text-orange-600 dark:!text-orange-400',
	'/settings/task-manager': '!bg-indigo-500/15 !text-indigo-600 dark:!text-indigo-400',
	// Apps
	'/settings/apps': '!bg-teal-500/15 !text-teal-600 dark:!text-teal-400',
	// AI Agents (operators)
	'/settings/operators/friday/details': '!bg-violet-500/15 !text-violet-600 dark:!text-violet-400',
	'/settings/operators/speech-to-text/details': '!bg-sky-500/15 !text-sky-600 dark:!text-sky-400',
	'/settings/operators/text-to-speech/details': '!bg-pink-500/15 !text-pink-600 dark:!text-pink-400',
	'/settings/operators/image-assistant/details': '!bg-emerald-500/15 !text-emerald-600 dark:!text-emerald-400',
	'/settings/operators/text-to-video/details': '!bg-red-500/15 !text-red-600 dark:!text-red-400',
	'/settings/operators/music-creator/details': '!bg-fuchsia-500/15 !text-fuchsia-600 dark:!text-fuchsia-400',
};

const SETTINGS_OVERVIEW_GROUPS = [
	{
		id: 'general',
		titleKey: 'settings.overview.groups.general',
		paths: ['/settings/general', '/settings/system', '/settings/providers', '/settings/channels'],
	},
	{
		id: 'aiAgents',
		titleKey: 'settings.overview.groups.aiAgents',
		operators: true,
		paths: [],
	},
	{
		id: 'aiFeatures',
		titleKey: 'settings.overview.groups.aiFeatures',
		paths: ['/settings/skills', '/settings/connectors'],
	},
	{
		id: 'automations',
		titleKey: 'settings.overview.groups.automations',
		paths: ['/settings/heartbeat', '/settings/cron', '/settings/task-manager'],
	},
	{
		id: 'apps',
		paths: ['/settings/apps'],
	},
] satisfies readonly {
	readonly id: string;
	readonly titleKey?: string;
	readonly operators?: boolean;
	readonly paths: readonly string[];
}[];

function getSettingsNavigationItem(path: string): SettingsNavigationItem {
	return SETTINGS_NAVIGATION.find((item) => item.path === path)!;
}

function SettingsOverviewCard({
	item,
}: {
	readonly item: SettingsNavigationItem | SettingsOperatorItem;
}): React.JSX.Element {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const handleActivate = (): void => {
		navigate(item.path);
	};

	return (
		<Item
			as="button"
			type="button"
			onClick={handleActivate}
			variant="outline"
			size="md"
			className="grid grid-cols-[1.5rem_minmax(0,1fr)_0.75rem] items-center border-b border-border/60 text-left hover:bg-muted/30 last:border-b-0"
		>
			<ItemIcon icon={item.icon} />
			<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
				<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
					{t(item.labelKey)}
				</ItemTitle>
			</ItemContent>
			<ItemActions className="ml-0 flex-none justify-end">
				<ChevronRight
					className="size-3 shrink-0 text-muted-foreground"
					strokeWidth={1.8}
				/>
			</ItemActions>
		</Item>
	);
}

const OverviewPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<SettingsPageShell>
				<SettingsPageHeader
					title={t('settings.title')}
					description={t('settings.description')}
				/>
				{SETTINGS_OVERVIEW_GROUPS.map((group) => {
					const panel = (
						<SettingsPanel>
							{group.operators && SETTINGS_OPERATOR_ITEMS.map((item) => (
								<SettingsOverviewCard key={item.path} item={item} />
							))}
							{group.paths.map((path) => {
								const item = getSettingsNavigationItem(path);
								return <SettingsOverviewCard key={item.path} item={item} />;
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
