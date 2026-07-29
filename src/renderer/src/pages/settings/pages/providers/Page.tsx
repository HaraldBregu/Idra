import React from 'react';
import { Boxes, ChevronRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Item, ItemActions, ItemContent, ItemIcon, ItemTitle } from '@/components/ui/item';
import {
	SettingsPageHeader,
	SettingsPageShell,
	SettingsPanel,
	SettingsSection,
} from '../../components';
import { SETTINGS_PROVIDER_CONFIG_ITEMS } from '../../navigation';

const ProvidersPage: React.FC = () => {
	const { t } = useTranslation();
	const navigate = useNavigate();

	return (
		<SettingsPageShell>
			<SettingsPageHeader
				title={t('settings.tabs.providers')}
				description={t('settings.providers.description')}
			/>

			<SettingsSection
				title={t('settings.overview.groups.mlModels')}
				description={t('settings.providers.mlModelsDescription')}
			>
				<SettingsPanel>
					<Item
						as="button"
						type="button"
						onClick={() => navigate('/settings/providers/keys')}
						variant="outline"
						size="md"
						className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center px-4 text-left"
					>
						<ItemIcon icon={Sparkles} className="size-8 [&_svg]:size-4" />
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
								{t('settings.overview.groups.mlModels')}
							</ItemTitle>
							<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground">
								{t('settings.providers.mlModelsDescription')}
							</p>
						</ItemContent>
						<ItemActions className="ml-0 flex-none justify-end">
							<ChevronRight className="size-3 shrink-0 text-muted-foreground/40" strokeWidth={1.8} />
						</ItemActions>
					</Item>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.overview.groups.vectorDatabases')}
				description={t('settings.providers.vectorDatabasesDescription')}
			>
				<SettingsPanel>
					<Item
						as="button"
						type="button"
						onClick={() => navigate('/settings/providers/vectordb')}
						variant="outline"
						size="md"
						className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center px-4 text-left"
					>
						<ItemIcon icon={Boxes} className="size-8 [&_svg]:size-4" />
						<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
							<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
								{t('settings.overview.groups.vectorDatabases')}
							</ItemTitle>
							<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground">
								{t('settings.providers.vectorDatabasesDescription')}
							</p>
						</ItemContent>
						<ItemActions className="ml-0 flex-none justify-end">
							<ChevronRight className="size-3 shrink-0 text-muted-foreground/40" strokeWidth={1.8} />
						</ItemActions>
					</Item>
				</SettingsPanel>
			</SettingsSection>

			<SettingsSection
				title={t('settings.overview.groups.configuration')}
				description={t('settings.providers.configurationDescription')}
			>
				<SettingsPanel>
					{SETTINGS_PROVIDER_CONFIG_ITEMS.map((item, index) => (
						<Item
							key={item.path}
							as="button"
							type="button"
							onClick={() => navigate(item.path)}
							variant="outline"
							size="md"
							className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center px-4 text-left ${
								index < SETTINGS_PROVIDER_CONFIG_ITEMS.length - 1 ? 'border-b border-border/30' : ''
							} last:border-b-0`}
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
