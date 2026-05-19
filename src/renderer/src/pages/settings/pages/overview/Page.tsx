import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
import { SettingsPageHeader, SettingsPageShell } from '../../components';
import { SETTINGS_NAVIGATION, type SettingsNavigationItem } from '../../navigation';

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

	const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		handleActivate();
	};

	return (
		<Item
			role="button"
			tabIndex={0}
			onClick={handleActivate}
			onKeyDown={handleKeyDown}
			variant="outline"
			size="sm"
			className="group min-h-12 flex-nowrap gap-3 rounded-lg border border-border/70 bg-card text-left text-card-foreground whitespace-normal hover:border-foreground/15 hover:bg-card/95 focus-visible:ring-2 focus-visible:ring-ring/55"
		>
			<ItemIcon icon={item.icon} className="transition group-hover:bg-foreground group-hover:text-background" />
			<ItemContent className="min-w-0 flex-1">
				<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
					{t(item.labelKey)}
				</ItemTitle>
			</ItemContent>
			<ItemActions className="ml-auto flex-none justify-end">
				<ChevronRight
					className="size-3 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground"
					strokeWidth={1.8}
				/>
			</ItemActions>
		</Item>
	);
}

const OverviewPage: React.FC = () => {
	const { t } = useTranslation();

	return (
		<SettingsPageShell className="gap-2">
			<SettingsPageHeader
				title={t('settings.title')}
				description={t('settings.description')}
			/>
			<div className="grid gap-2">
				{SETTINGS_NAVIGATION.map((item) => (
					<SettingsOverviewCard key={item.path} item={item} />
				))}
			</div>
		</SettingsPageShell>
	);
};

export default OverviewPage;
