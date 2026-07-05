import React, { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, LoaderCircle, Save } from 'lucide-react';
import {
	LLM_MODELS_BY_PROVIDER,
	LLM_PROVIDERS,
} from '../../../shared/provider_models_definitions';
import { Button } from '@/components/ui/button';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { SettingsField, SettingsLoadingRows } from '@pages/settings/components';
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
	readonly saved?: string;
	readonly saving?: string;
	readonly save?: string;
}

interface ModelProviderFieldsProps {
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

export function ModelProviderFields({
	idPrefix,
	providerGroups,
	providerId,
	modelId,
	onProviderChange,
	onModelChange,
	disabled = false,
	labels,
	showFieldDescriptions = false,
}: ModelProviderFieldsProps): React.JSX.Element {
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

interface ModelProviderSelectProps extends ModelProviderFieldsProps {
	readonly loading?: boolean;
	readonly saving?: boolean;
	readonly saved?: boolean;
	readonly error?: string | null;
	readonly onSave: () => void | Promise<void>;
	readonly emptyState?: ReactNode;
}

export function ModelProviderSelect({
	loading = false,
	saving = false,
	saved = false,
	error = null,
	onSave,
	emptyState,
	labels,
	providerGroups,
	providerId,
	modelId,
	...fieldsProps
}: ModelProviderSelectProps): React.JSX.Element {
	const { t } = useTranslation();
	const selectedGroup = useMemo(
		() => providerGroups.find((group) => group.id === providerId),
		[providerGroups, providerId]
	);
	const selectedModel = selectedGroup?.models.find((model) => model.id === modelId);

	const providerPlaceholder =
		labels?.providerPlaceholder ?? t('settings.modelServices.providerPlaceholder');
	const modelPlaceholder =
		labels?.modelPlaceholder ?? t('settings.modelServices.modelPlaceholder');

	const content =
		loading ? (
			<SettingsLoadingRows rows={1} />
		) : providerGroups.length === 0 && emptyState ? (
			emptyState
		) : (
			<div className="grid gap-3 px-3 py-3">
				<ModelProviderFields
					providerGroups={providerGroups}
					providerId={providerId}
					modelId={modelId}
					labels={labels}
					disabled={fieldsProps.disabled || saving}
					{...fieldsProps}
				/>

				{error && <p className="text-[11px] leading-4 text-destructive">{error}</p>}
				{saved && (
					<p className="text-[11px] leading-4 text-muted-foreground">
						{labels?.saved ?? t('settings.modelServices.saved')}
					</p>
				)}

				<div className="flex justify-end">
					<Button
						type="button"
						size="sm"
						disabled={saving || !providerId || !modelId}
						onClick={() => void onSave()}
					>
						{saving ? (
							<LoaderCircle className="size-3 animate-spin" />
						) : (
							<Save className="size-3" />
						)}
						{saving
							? (labels?.saving ?? t('settings.modelServices.saving'))
							: (labels?.save ?? t('common.save'))}
					</Button>
				</div>
			</div>
		);

	return (
		<Collapsible className="rounded-lg border border-border/70 bg-card">
			<CollapsibleTrigger className="group flex w-full items-center gap-3 px-3 py-2.5 text-left">
				<div className="min-w-0 flex-1">
					<div className="truncate text-[13px] font-medium leading-4 text-foreground">
						{selectedGroup
							? getProviderCatalogItem(selectedGroup.id).name
							: providerPlaceholder}
					</div>
					<p className="mt-0.5 truncate text-[11px] leading-4 text-muted-foreground">
						{selectedModel?.name ?? selectedModel?.id ?? modelPlaceholder}
					</p>
				</div>
				<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-panel-open:rotate-180" />
			</CollapsibleTrigger>
			<CollapsibleContent className="border-t border-border/60">{content}</CollapsibleContent>
		</Collapsible>
	);
}
