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
			<SettingsSection title={t('settings.overview.backToSettings')}>
				<SettingsPanel>
					{SETTINGS_NAVIGATION.map((item) => (
						<SettingsOverviewCard key={item.path} item={item} />
					))}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default OverviewPage;
