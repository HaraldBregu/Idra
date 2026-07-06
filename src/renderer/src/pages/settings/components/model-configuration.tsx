import React, { type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronDown, LoaderCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ModelProviderSelect, toModelProviderGroups } from '@/components/model-provider-select';
import { getProviderCatalogItem } from '../../start/constants';
import { SettingsLoadingRows, SettingsNotice } from './index';
import type { ModelConfigurationState } from './model-configuration-state';

interface ModelProviderConfigurationProps {
	readonly configState: ModelConfigurationState;
	readonly idPrefix: string;
	readonly providerDescription: ReactNode;
	readonly modelDescription: ReactNode;
	readonly triggerTitle?: ReactNode;
	readonly triggerDescription?: ReactNode;
	readonly showInlineError?: boolean;
	readonly showSaveButton?: boolean;
	readonly defaultOpen?: boolean;
	readonly onProviderChange: (nextProviderId: string) => void;
	readonly onModelChange: (nextModelId: string) => void;
	readonly onSave: () => void;
}

export function ModelProviderConfiguration({
	configState,
	idPrefix,
	providerDescription,
	modelDescription,
	triggerTitle,
	triggerDescription,
	showInlineError = false,
	showSaveButton = true,
	defaultOpen = false,
	onProviderChange,
	onModelChange,
	onSave,
}: ModelProviderConfigurationProps): React.JSX.Element {
	const { t } = useTranslation();
	const group = configState.modelGroups.find(
		(item) => item.provider.id === configState.providerId
	);
	const provider = group?.provider;
	const model = group?.models.find((item) => item.id === configState.modelId);
	const providerName = provider
		? getProviderCatalogItem(provider.id).name
		: t('settings.modelServices.providerPlaceholder');
	const modelName = model?.name ?? model?.id ?? t('settings.modelServices.modelUnavailable');

	return (
		<Collapsible defaultOpen={defaultOpen} className="rounded-lg border border-border/70 bg-card">
			<CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left">
				<div className="min-w-0 flex-1">
					<div className="truncate text-[13px] font-medium leading-4 text-foreground">
						{triggerTitle ?? providerName}
					</div>
					<p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
						{triggerDescription ?? modelName}
					</p>
				</div>
				<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
			</CollapsibleTrigger>
			<CollapsibleContent className="border-t border-border/60">
				{configState.loading ? (
					<SettingsLoadingRows rows={2} />
				) : (
					<div className="grid gap-3 px-3 py-3">
						{showInlineError && configState.error && (
							<SettingsNotice variant="destructive" icon={AlertTriangle}>
								{configState.error}
							</SettingsNotice>
						)}

						<ModelProviderSelect
							idPrefix={idPrefix}
							providerGroups={toModelProviderGroups(configState.modelGroups)}
							providerId={configState.providerId}
							modelId={configState.modelId}
							onProviderChange={onProviderChange}
							onModelChange={onModelChange}
							disabled={
								configState.loading ||
								configState.saving ||
								configState.modelGroups.length === 0
							}
							modelDisabled={
								configState.loading ||
								configState.loadingModels ||
								configState.saving ||
								!provider ||
								!group ||
								group.models.length === 0
							}
							labels={{
								providerDescription,
								modelDescription,
								modelPlaceholder: configState.loadingModels
									? t('settings.modelServices.modelsLoading')
									: undefined,
							}}
						/>

						{configState.providers.length === 0 && (
							<p className="text-[11px] leading-4 text-muted-foreground">
								{t('settings.providers.noProviders')}
							</p>
						)}
						{configState.providers.length > 0 && configState.modelGroups.length === 0 && (
							<p className="text-[11px] leading-4 text-muted-foreground">
								{t('settings.modelServices.noModels')}
							</p>
						)}
						{configState.saved && (
							<p className="text-[11px] leading-4 text-muted-foreground">
								{t('settings.modelServices.saved')}
							</p>
						)}

						<div className="flex justify-end">
							<Button
								type="button"
								size="sm"
								disabled={configState.saving || !provider || !model}
								onClick={onSave}
							>
								{configState.saving ? (
									<LoaderCircle className="size-3 animate-spin" />
								) : (
									<Save className="size-3" />
								)}
								{configState.saving ? t('settings.modelServices.saving') : t('common.save')}
							</Button>
						</div>
					</div>
				)}
			</CollapsibleContent>
		</Collapsible>
	);
}
