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

export function toModelConfigurationState(
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
	const configState = useMemo(
		() => toModelConfigurationState(serviceState, loadingModels, savingConfig),
		[loadingModels, savingConfig, serviceState]
	);

	return (
		<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-8 sm:px-6">
			<StepHeader
				icon={service.icon}
				required={service.required}
				title={service.stepTitle}
				description={service.stepDescription}
			/>

			<div className="mt-8 max-w-md">
				<ModelProviderConfiguration
					key={service.id}
					configState={configState}
					idPrefix={service.id}
					providerDescription={t('settings.modelServices.providerDescription')}
					modelDescription={t('settings.modelServices.modelDescription')}
					collapsible={false}
					showSaveButton={false}
					onProviderChange={(value) => onProviderChange(service.id, value)}
					onModelChange={(value) => onModelChange(service.id, value)}
					onSave={() => undefined}
				/>
			</div>
		</div>
	);
}
