import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { ModelProviderConfiguration } from '@pages/settings/components/model-configuration';
import type { ModelConfigurationState } from '@pages/settings/components/model-configuration-state';
import type { ModelServiceDefinition, ModelServiceId, ModelServiceState } from '../types';

type ModelServiceStepProps = {
	readonly service: ModelServiceDefinition;
	readonly serviceState: ModelServiceState;
	readonly loadingModels: boolean;
	readonly savingConfig: boolean;
	readonly onProviderChange: (serviceId: ModelServiceId, value: string | null) => void;
	readonly onModelChange: (serviceId: ModelServiceId, value: string | null) => void;
};

function toModelConfigurationState(
	serviceState: ModelServiceState,
	loadingModels: boolean,
	savingConfig: boolean
): ModelConfigurationState {
	return {
		providers: serviceState.modelGroups.map((group) => group.provider),
		modelGroups: serviceState.modelGroups,
		providerId: serviceState.providerId,
		modelId: serviceState.modelId,
		loading: loadingModels && serviceState.modelGroups.length === 0,
		loadingModels,
		saving: savingConfig,
		saved: false,
		error: null,
	};
}

export function ModelServiceStep({
	service,
	serviceState,
	loadingModels,
	savingConfig,
	onProviderChange,
	onModelChange,
}: ModelServiceStepProps): React.JSX.Element {
	const { t } = useTranslation();
	const ServiceIcon = service.icon;
	const configState = useMemo(
		() => toModelConfigurationState(serviceState, loadingModels, savingConfig),
		[loadingModels, savingConfig, serviceState]
	);

	return (
		<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-8 sm:px-6">
			<div className="mb-6 flex size-11 items-center justify-center rounded-full bg-foreground/[0.06] text-foreground">
				<ServiceIcon className="size-5" strokeWidth={1.6} aria-hidden="true" />
			</div>

			<Badge variant={service.required ? 'default' : 'secondary'} className="mb-3 w-fit">
				{service.required ? 'Required' : 'Optional'}
			</Badge>

			<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
				{service.stepTitle}
			</h1>
			<p className="mt-2 max-w-md text-xs font-medium leading-relaxed text-muted-foreground">
				{service.stepDescription}
			</p>

			<div className="mt-8 max-w-md">
				<ModelProviderConfiguration
					configState={configState}
					idPrefix={service.id}
					triggerTitle={service.stepTitle}
					triggerDescription={service.stepDescription}
					providerDescription={t('settings.modelServices.providerDescription')}
					modelDescription={t('settings.modelServices.modelDescription')}
					defaultOpen
					showSaveButton={false}
					onProviderChange={(value) => onProviderChange(service.id, value)}
					onModelChange={(value) => onModelChange(service.id, value)}
					onSave={() => undefined}
				/>
			</div>
		</div>
	);
}
