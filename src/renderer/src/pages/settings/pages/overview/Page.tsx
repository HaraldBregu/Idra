import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AudioWaveform, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
import { AGENTS } from '@/lib/compat';
import type { SearchEngineId } from '../../../../../../shared/search_types';
import { SettingsPageHeader, SettingsPageShell, SettingsPanel } from '../../components';
import {
	SETTINGS_NAVIGATION,
	SETTINGS_MODEL_SERVICE_ITEMS,
	type SettingsNavigationItem,
	type SettingsModelServiceItem,
} from '../../navigation';

// Each group owns a hue applied as a soft tint to the icon *container* (the
// icon glyph keeps its default muted color). Items within a group alternate
// opacity for a subtle per-item difference. Low-contrast band: light ~10-15%,
// dark ~20-25%. Colors are aligned index-for-index with paths, as literal
// class strings so Tailwind's static extraction keeps them.
const SETTINGS_OVERVIEW_GROUPS = [
	{
		id: 'general',
		paths: ['/settings/application', '/settings/system', '/settings/providers'],
		colors: [
			'bg-slate-500/10 dark:bg-slate-500/20',
			'bg-slate-500/15 dark:bg-slate-500/25',
			'bg-slate-500/10 dark:bg-slate-500/20',
		],
	},
	{
		id: 'primary',
		paths: [
			'/settings/assistant',
			'/settings/skills',
			'/settings/mcp',
			'/settings/library',
			'/settings/tasks',
		],
		colors: [
			'bg-blue-500/10 dark:bg-blue-500/20',
			'bg-blue-500/15 dark:bg-blue-500/25',
			'bg-blue-500/10 dark:bg-blue-500/20',
			'bg-blue-500/15 dark:bg-blue-500/25',
			'bg-blue-500/10 dark:bg-blue-500/20',
		],
	},
	{
		id: 'modelServices',
		paths: [
			'/settings/transcribe',
			'/settings/voice',
			'/settings/image',
			'/settings/video',
			'/settings/music',
		],
		colors: [
			'bg-violet-500/10 dark:bg-violet-500/20',
			'bg-violet-500/15 dark:bg-violet-500/25',
			'bg-violet-500/10 dark:bg-violet-500/20',
			'bg-violet-500/15 dark:bg-violet-500/25',
			'bg-violet-500/10 dark:bg-violet-500/20',
		],
	},
	{
		id: 'channels',
		paths: ['/settings/channels'],
		colors: ['bg-emerald-500/10 dark:bg-emerald-500/20'],
	},
	{
		id: 'widgets',
		paths: ['/settings/widgets'],
		colors: ['bg-amber-500/10 dark:bg-amber-500/20'],
	},
	{
		id: 'cloud',
		paths: ['/settings/cloud'],
		colors: ['bg-cyan-500/10 dark:bg-cyan-500/20'],
	},
	{
		id: 'search',
		paths: ['/settings/search'],
		colors: ['bg-rose-500/10 dark:bg-rose-500/20'],
	},
] as const;

function getSettingsOverviewItem(path: string): SettingsNavigationItem | SettingsModelServiceItem {
	const navigationItem = SETTINGS_NAVIGATION.find((item) => item.path === path);
	if (navigationItem) return navigationItem;

	const serviceItem = SETTINGS_MODEL_SERVICE_ITEMS.find((item) => item.path === path);
	if (!serviceItem) throw new Error(`Missing settings overview item: ${path}`);
	if (serviceItem.id === AGENTS.speechToText) {
		return { ...serviceItem, icon: AudioWaveform };
	}
	return serviceItem;
}

function SettingsOverviewCard({
	item,
	badge,
	iconColor,
	disabled = false,
}: {
	readonly item: SettingsNavigationItem | SettingsModelServiceItem;
	readonly badge?: React.ReactNode;
	readonly iconColor?: string;
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
			<ItemIcon icon={item.icon} className={`size-8 [&_svg]:size-4 ${iconColor ?? ''}`} />
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
	const [selectedSearchEngine, setSelectedSearchEngine] = useState<SearchEngineId | null>(null);

	useEffect(() => {
		let cancelled = false;
		void window.search.getSettings().then(
			(settings) => {
				if (!cancelled) setSelectedSearchEngine(settings.engineId);
			},
			() => undefined
		);
		return () => {
			cancelled = true;
		};
	}, []);

	return (
		<SettingsPageShell>
			<SettingsPageHeader title={t('settings.title')} description={t('settings.description')} />
			{SETTINGS_OVERVIEW_GROUPS.map((group) => (
				<section key={group.id} className="flex flex-col gap-2">
					<SettingsPanel>
						{group.paths.map((path, index) => {
							const item = getSettingsOverviewItem(path);
							return (
								<SettingsOverviewCard
									key={path}
									item={item}
									iconColor={group.colors[index]}
									badge={
										path === '/settings/search' && selectedSearchEngine ? (
											<Badge variant="outline" className="text-[10px] leading-none">
												{t(`settings.searchEngine.${selectedSearchEngine}Name`)}
											</Badge>
										) : undefined
									}
									disabled={disabledOverviewPaths.has(path)}
								/>
							);
						})}
					</SettingsPanel>
				</section>
			))}
		</SettingsPageShell>
	);
};

export default OverviewPage;
