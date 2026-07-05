import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
	LLM_MODELS_BY_PROVIDER,
	LLM_PROVIDERS,
} from '../../../shared/provider_models_definitions';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { SettingsField } from '@pages/settings/components';
import { getProviderCatalogItem } from '@pages/start/constants';

export interface ModelProviderGroup {
	readonly id: string;
	readonly models: readonly { readonly id: string; readonly name: string }[];
}

export const LLM_PROVIDER_GROUPS: readonly ModelProviderGroup[] = LLM_PROVIDERS.map((id) => ({
	id,
	models: LLM_MODELS_BY_PROVIDER[id] ?? [],
})).filter((group) => group.models.length > 0);

export function firstModelIdForProvider(
	providerGroups: readonly ModelProviderGroup[],
	providerId: string
): string {
	const group = providerGroups.find((item) => item.id === providerId);
	return group?.models[0]?.id ?? '';
}

export function resolveStoredModelProvider(
	providerGroups: readonly ModelProviderGroup[],
	storedProviderId: string | null | undefined,
	storedModelId: string | null | undefined
): { providerId: string; modelId: string } {
	const group =
		providerGroups.find((item) => item.id === storedProviderId) ?? providerGroups[0];
	const model =
		group?.models.find((item) => item.id === storedModelId) ?? group?.models[0];
	return {
		providerId: group?.id ?? '',
		modelId: model?.id ?? '',
	};
}

interface ModelProviderSelectLabels {
	readonly provider?: string;
	readonly model?: string;
	readonly providerPlaceholder?: string;
	readonly modelPlaceholder?: string;
}

interface ModelProviderSelectProps {
	readonly idPrefix: string;
	readonly providerGroups: readonly ModelProviderGroup[];
	readonly providerId: string;
	readonly modelId: string;
	readonly onProviderChange: (nextProviderId: string) => void;
	readonly onModelChange: (nextModelId: string) => void;
	readonly disabled?: boolean;
	readonly labels?: ModelProviderSelectLabels;
	readonly showFieldDescriptions?: boolean;
}

export function ModelProviderSelect({
	idPrefix,
	providerGroups,
	providerId,
	modelId,
	onProviderChange,
	onModelChange,
	disabled = false,
	labels,
	showFieldDescriptions = false,
}: ModelProviderSelectProps): React.JSX.Element {
	const { t } = useTranslation();
	const selectedGroup = useMemo(
		() => providerGroups.find((group) => group.id === providerId),
		[providerGroups, providerId]
	);

	return (
		<div className="grid gap-3 sm:grid-cols-2">
			<SettingsField
				id={`${idPrefix}-provider`}
				label={labels?.provider ?? t('settings.modelServices.provider')}
				description={
					showFieldDescriptions ? t('settings.modelServices.providerDescription') : undefined
				}
			>
				<Select
					value={providerId}
					onValueChange={(value) => onProviderChange(value ?? '')}
					disabled={disabled}
				>
					<SelectTrigger id={`${idPrefix}-provider`} className="w-full text-xs">
						<SelectValue
							placeholder={
								labels?.providerPlaceholder ?? t('settings.modelServices.providerPlaceholder')
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{providerGroups.map((group) => (
							<SelectItem key={group.id} value={group.id}>
								{getProviderCatalogItem(group.id).name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</SettingsField>

			<SettingsField
				id={`${idPrefix}-model`}
				label={labels?.model ?? t('settings.modelServices.model')}
				description={
					showFieldDescriptions ? t('settings.modelServices.modelDescription') : undefined
				}
			>
				<Select
					value={modelId}
					onValueChange={(value) => onModelChange(value ?? '')}
					disabled={disabled || !selectedGroup || selectedGroup.models.length === 0}
				>
					<SelectTrigger id={`${idPrefix}-model`} className="w-full text-xs">
						<SelectValue
							placeholder={
								labels?.modelPlaceholder ?? t('settings.modelServices.modelPlaceholder')
							}
						/>
					</SelectTrigger>
					<SelectContent>
						{selectedGroup?.models.map((model) => (
							<SelectItem key={model.id} value={model.id}>
								{model.name || model.id}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</SettingsField>
		</div>
	);
}
