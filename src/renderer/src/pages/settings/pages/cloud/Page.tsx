import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Folder } from 'lucide-react';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
import { SettingsPageHeader, SettingsPageShell, SettingsPanel } from '../../components';

const CloudPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.cloud')}
				description={t('settings.overview.descriptions.cloud')}
			/>
			<SettingsPanel>
				<Item
					as="button"
					type="button"
					onClick={() => navigate('/settings/cloud/object-storage')}
					variant="outline"
					size="md"
					className="grid cursor-pointer grid-cols-[2rem_minmax(0,1fr)_auto] items-center text-left hover:bg-muted/50"
				>
					<ItemIcon icon={Folder} className="size-8 [&_svg]:size-4" />
					<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
						<ItemTitle>{t('settings.storage.configurationTitle')}</ItemTitle>
						<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground">
							{t('settings.storage.description')}
						</p>
					</ItemContent>
					<ItemActions className="ml-0 flex-none justify-end">
						<ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={1.8} />
					</ItemActions>
				</Item>
			</SettingsPanel>
		</SettingsPageShell>
	);
};

export default CloudPage;
