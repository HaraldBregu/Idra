import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, LoaderCircle, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { loadModels } from '@/lib/providers';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
import {
	SettingsNotice,
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
		paths: ['/settings/general', '/settings/system', '/settings/application'],
	},
	{
		id: 'primary',
		titleKey: 'settings.overview.groups.assistant',
		paths: ['/settings/assistant', '/settings/skills', '/settings/rag', '/settings/wiki'],
	},
	{
		id: 'providers',
		titleKey: 'settings.tabs.providers',
		paths: [
			'/settings/providers/models',
			'/settings/providers/search',
			'/settings/providers/databases',
			'/settings/providers/storage',
			'/settings/providers/mcp',
		],
	},
	{
		id: 'integrations',
		paths: ['/settings/extensions', '/settings/channels'],
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
	const [uploadingProvider, setUploadingProvider] = useState(false);
	const [providerError, setProviderError] = useState<string | null>(null);

	const handleUploadProvider = async (): Promise<void> => {
		setUploadingProvider(true);
		setProviderError(null);
		try {
			const uploaded = await window.app.uploadProvider();
			if (uploaded) await loadModels();
		} catch {
			setProviderError('Could not upload provider.');
		} finally {
			setUploadingProvider(false);
		}
	};

	const providersAction = (
		<Button
			type="button"
			variant="outline"
			size="icon-xs"
			className="ml-auto"
			aria-label="Upload provider"
			title="Upload provider"
			disabled={uploadingProvider}
			onClick={() => void handleUploadProvider()}
		>
			{uploadingProvider ? (
				<LoaderCircle className="size-3.5 animate-spin" />
			) : (
				<Plus className="size-3.5" />
			)}
		</Button>
	);

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

				return 'titleKey' in group ? (
					<SettingsSection
						key={group.id}
						title={t(group.titleKey)}
						description={
							group.id === 'providers'
								? t('settings.overview.descriptions.providers')
								: undefined
						}
						action={group.id === 'providers' ? providersAction : undefined}
					>
						{group.id === 'providers' && providerError && (
							<SettingsNotice variant="destructive" icon={AlertTriangle}>
								{providerError}
							</SettingsNotice>
						)}
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
