import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
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
		id: 'general',
		paths: ['/settings/general', '/settings/system', '/settings/cloud'],
	},
	{
		id: 'primary',
		titleKey: 'settings.overview.groups.assistant',
		paths: [
			'/settings/assistant',
			'/settings/skills',
			'/settings/rag',
			'/settings/wiki',
			'/settings/tasks',
			'/settings/providers/mcp',
		],
	},
	{
		id: 'providers',
		titleKey: 'settings.tabs.providers',
		paths: [
			'/settings/providers/models',
			'/settings/providers/search',
			'/settings/providers/databases',
			'/settings/providers/storage',
			'/settings/channels',
		],
	},
	{
		id: 'integrations',
		paths: ['/settings/extensions'],
	},
] as const;

function getSettingsOverviewItem(path: string): SettingsNavigationItem | SettingsModelServiceItem {
	const navigationItem = SETTINGS_NAVIGATION.find((item) => item.path === path);
	if (navigationItem) return navigationItem;

	const serviceItem = SETTINGS_MODEL_SERVICE_ITEMS.find((item) => item.path === path);
	if (!serviceItem) throw new Error(`Missing settings overview item: ${path}`);
	return serviceItem;
}

function SettingsOverviewCard({
	item,
	disabled = false,
}: {
	readonly item: SettingsNavigationItem | SettingsModelServiceItem;
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
						{group.paths.map((path) => {
							const item = getSettingsOverviewItem(path);
							return (
								<SettingsOverviewCard
									key={path}
									item={item}
									disabled={disabledOverviewPaths.has(path)}
								/>
							);
						})}
					</SettingsPanel>
				);

				if (group.id === 'providers') {
					return (
						<section key={group.id} className="flex flex-col gap-2">
							<Item size="sm" className="px-0.5">
								<ItemContent className="min-w-0 flex-col items-start gap-0">
									<ItemTitle>{t(group.titleKey)}</ItemTitle>
									<p className="mt-0.5 max-w-2xl text-[10px] leading-4 text-muted-foreground">
										{t('settings.overview.descriptions.providers')}
									</p>
								</ItemContent>
							</Item>
							{panel}
						</section>
					);
				}

				return 'titleKey' in group ? (
					<SettingsSection key={group.id} title={t(group.titleKey)}>
						{panel}
					</SettingsSection>
				) : (
					<section key={group.id} className="flex flex-col gap-2">
						{panel}
					</section>
				);
			})}
		</SettingsPageShell>
	);
};

export default OverviewPage;
