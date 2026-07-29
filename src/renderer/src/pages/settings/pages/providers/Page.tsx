import React from 'react';
import { Boxes, ChevronRight, Sparkles } from 'lucide-react';
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
import {
	SETTINGS_MODEL_SERVICE_ITEMS,
	SETTINGS_PROVIDER_CONFIG_ITEMS,
} from '../../navigation';

const ItemComponent: React.FC<{
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	description: string;
	onClick: () => void;
	hasBorder?: boolean;
}> = ({ icon: Icon, label, description, onClick, hasBorder = false }) => (
	<Item
		as="button"
		type="button"
		onClick={onClick}
		variant="outline"
		size="md"
		className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center px-4 text-left ${
			hasBorder ? 'border-b border-border/30' : ''
		} last:border-b-0`}
	>
		<ItemIcon icon={Icon} className="size-8 [&_svg]:size-4" />
		<ItemContent className="min-w-0 flex-1 flex-col items-start gap-0">
			<ItemTitle className="w-full max-w-full truncate leading-4 tracking-normal">
				{label}
			</ItemTitle>
			<p className="mt-0.5 w-full truncate text-[11px] leading-4 text-muted-foreground">
				{description}
			</p>
		</ItemContent>
		<ItemActions className="ml-0 flex-none justify-end">
			<ChevronRight className="size-3 shrink-0 text-muted-foreground/40" strokeWidth={1.8} />
		</ItemActions>
	</Item>
);

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

			<SettingsSection
				title={t('settings.overview.groups.mlModels')}
				description={t('settings.providers.mlModelsDescription')}
			>
				<SettingsPanel>
					<ItemComponent
						icon={Sparkles}
						label={t('settings.overview.groups.mlModels')}
						description={t('settings.providers.mlModelsDescription')}
						onClick={() => navigate('/settings/providers/keys')}
						hasBorder={modelItems.length > 0}
					/>
					{modelItems.map((item, index) => (
						<Item
							key={item.id}
							as="button"
							type="button"
							onClick={() => navigate(item.path)}
							variant="outline"
							size="md"
							className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center px-4 text-left ${
								index < modelItems.length - 1 ? 'border-b border-border/30' : ''
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

			<SettingsSection
				title={t('settings.overview.groups.vectorDatabases')}
				description={t('settings.providers.vectorDatabasesDescription')}
			>
				<SettingsPanel>
					<ItemComponent
						icon={Boxes}
						label={t('settings.overview.groups.vectorDatabases')}
						description={t('settings.providers.vectorDatabasesDescription')}
						onClick={() => navigate('/settings/providers/vectordb')}
					/>
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
