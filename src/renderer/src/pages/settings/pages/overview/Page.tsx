import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import type { WikiSettings } from '../../../../../shared/wiki_types';
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
			'/settings/knowledge-base',
			'/settings/llm-wiki',
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
		],
	},
	{
		id: 'channels',
		paths: ['/settings/channels'],
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
	wikiSettings,
	wikiSaving = false,
	onWikiEnabledChange,
}: {
	readonly item: SettingsNavigationItem | SettingsModelServiceItem;
	readonly disabled?: boolean;
	readonly wikiSettings?: WikiSettings;
	readonly wikiSaving?: boolean;
	readonly onWikiEnabledChange?: (enabled: boolean) => void;
}): React.JSX.Element {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const unavailable = disabled || ('comingSoon' in item && item.comingSoon === true);
	const isWiki = item.path === '/settings/llm-wiki';
	const labelKey = item.labelKey;
	const handleActivate = (): void => {
		if (unavailable) return;
		navigate(item.path);
	};
	const content = (
		<>
			<ItemIcon icon={isWiki ? BrainCircuit : item.icon} className="size-8 [&_svg]:size-4" />
			<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
				<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
					{t(labelKey)}
				</ItemTitle>
				{'descriptionKey' in item && item.descriptionKey && (
					<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground">
						{t(item.descriptionKey)}
					</p>
				)}
			</ItemContent>
		</>
	);

	if (isWiki) {
		return (
			<Item
				variant="outline"
				size="md"
				className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center border-b border-border/30 px-4 text-left last:border-b-0"
			>
				<button type="button" onClick={handleActivate} className="contents">
					{content}
				</button>
				<ItemActions className="ml-0 flex-none justify-end">
					<Switch
						checked={wikiSettings?.enabled === true}
						disabled={!wikiSettings || wikiSaving}
						aria-label={t('settings.wiki.enabled')}
						onCheckedChange={onWikiEnabledChange}
					/>
				</ItemActions>
			</Item>
		);
	}

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
			{content}
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
	const [wikiSettings, setWikiSettings] = React.useState<WikiSettings>();
	const [wikiSaving, setWikiSaving] = React.useState(false);

	React.useEffect(() => {
		if (!window.wiki) return;
		void window.wiki.getSettings().then(setWikiSettings);
	}, []);

	const handleWikiEnabledChange = (enabled: boolean): void => {
		if (!wikiSettings) return;
		setWikiSaving(true);
		void window.wiki
			.saveSettings({ ...wikiSettings, enabled })
			.then(setWikiSettings)
			.finally(() => setWikiSaving(false));
	};

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
								wikiSettings={path === '/settings/llm-wiki' ? wikiSettings : undefined}
								wikiSaving={path === '/settings/llm-wiki' && wikiSaving}
								onWikiEnabledChange={
									path === '/settings/llm-wiki' ? handleWikiEnabledChange : undefined
								}
							/>
							);
						})}
					</SettingsPanel>
				);

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
