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
import { SETTINGS_NAVIGATION, type SettingsNavigationItem } from '../../navigation';

const SETTINGS_OVERVIEW_GROUPS = [
	{
		titleKey: 'settings.overview.groups.general',
		paths: ['/settings/general', '/settings/providers', '/settings/channels'],
	},
	{
		titleKey: 'settings.overview.groups.capabilities',
		paths: ['/settings/agents', '/settings/skills', '/settings/connectors'],
	},
	{
		titleKey: 'settings.overview.groups.automation',
		paths: ['/settings/heartbeat', '/settings/cron', '/settings/task-manager', '/settings/apps'],
	},
] satisfies readonly {
	readonly titleKey: string;
	readonly paths: readonly string[];
}[];

function getSettingsNavigationItem(path: string): SettingsNavigationItem {
	return SETTINGS_NAVIGATION.find((item) => item.path === path)!;
}

function SettingsOverviewCard({
	item,
}: {
	readonly item: SettingsNavigationItem;
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
			className="border-b border-border/60 text-left hover:bg-muted/30 last:border-b-0"
		>
			<ItemIcon icon={item.icon} />
			<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
				<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
					{t(item.labelKey)}
				</ItemTitle>
			</ItemContent>
			<ItemActions className="ml-auto flex-none justify-end">
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
			{SETTINGS_OVERVIEW_GROUPS.map((group) => (
				<SettingsSection key={group.titleKey} title={t(group.titleKey)}>
					<SettingsPanel>
						{group.paths.map((path) => {
							const item = getSettingsNavigationItem(path);
							return <SettingsOverviewCard key={item.path} item={item} />;
						})}
					</SettingsPanel>
				</SettingsSection>
			))}
		</SettingsPageShell>
	);
};

export default OverviewPage;
