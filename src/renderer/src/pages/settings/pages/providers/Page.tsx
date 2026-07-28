import React from 'react';
import { ChevronRight, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
import { AGENTS } from '@/lib/compat';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import { SETTINGS_MODEL_SERVICE_ITEMS } from '../../navigation';

const ProvidersPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const modelItems = SETTINGS_MODEL_SERVICE_ITEMS.filter((item) => item.id !== AGENTS.assistant);

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.providers')}
				description={t('settings.providers.description')}
			/>

			<SettingsPanel>
				<Item
					as="button"
					type="button"
					onClick={() => navigate('/settings/providers/keys')}
					variant="outline"
					size="md"
					className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center px-4 text-left"
				>
					<ItemIcon icon={KeyRound} className="size-8 [&_svg]:size-4" />
					<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
						<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
							{t('settings.providers.storeApiKeys')}
						</ItemTitle>
						<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground">
							{t('settings.providers.storeApiKeysDescription')}
						</p>
					</ItemContent>
					<ItemActions className="ml-0 flex-none justify-end">
						<ChevronRight className="size-3 shrink-0 text-muted-foreground/40" strokeWidth={1.8} />
					</ItemActions>
				</Item>
			</SettingsPanel>

			<SettingsSection
				title={t('settings.overview.groups.modelServices')}
				description={t('settings.providers.modelsDescription')}
			>
				<SettingsPanel>
					{modelItems.map((item) => (
						<Item
							key={item.id}
							as="button"
							type="button"
							onClick={() => navigate(item.path)}
							variant="outline"
							size="md"
							className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center border-b border-border/30 px-4 text-left last:border-b-0"
						>
							<ItemIcon icon={item.icon} className="size-8 [&_svg]:size-4" />
							<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
								<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
									{t(item.labelKey)}
								</ItemTitle>
								<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground">
									{t(item.descriptionKey)}
								</p>
							</ItemContent>
							<ItemActions className="ml-0 flex-none justify-end">
								<ChevronRight
									className="size-3 shrink-0 text-muted-foreground/40"
									strokeWidth={1.8}
								/>
							</ItemActions>
						</Item>
					))}
				</SettingsPanel>
			</SettingsSection>
		</SettingsPageShell>
	);
};

export default ProvidersPage;
