import React from 'react';
import { LogoView } from '@/components/app/base/logo-view';
import { ModelProviderConfiguration } from '@pages/settings/components/model-configuration';
import { StepHeader } from './StepHeader';
import { getProviderCatalogItem, MODEL_SERVICE_DEFINITIONS, STEP_COPY } from '../constants';
import type { ModelConfigurationState } from '@pages/settings/components/model-configuration-state';
import type { ModelServiceId, ModelServiceState, ModelServiceStateMap } from '../types';

type ModelsStepProps = {
	readonly serviceStates: ModelServiceStateMap;
	readonly loadingModels: boolean;
	readonly savingConfig: boolean;
	readonly onServiceChange: (serviceId: ModelServiceId, providerId: string, modelId: string) => void;
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

function getSelectionSummary(serviceState: ModelServiceState, fallback: string): string {
	const group = serviceState.modelGroups.find(
		(item) => item.provider.id === serviceState.providerId
	);
	const model = group?.models.find((item) => item.id === serviceState.modelId);
	return group && model
		? `${getProviderCatalogItem(group.provider.id).name} - ${model.name || model.id}`
		: fallback;
}

export function ModelsStep({
	serviceStates,
	loadingModels,
	savingConfig,
	onServiceChange,
}: ModelsStepProps): React.JSX.Element {
	return (
		<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-8 sm:px-6">
			<LogoView className="mb-6 size-11 rounded-xl" />
			<StepHeader title={STEP_COPY.models.title} description={STEP_COPY.models.description} />

			<div className="mt-8 grid gap-2">
				{MODEL_SERVICE_DEFINITIONS.map((service, index) => (
					<ModelProviderConfiguration
						key={service.id}
						configState={toModelConfigurationState(
							serviceStates[service.id],
							loadingModels,
							savingConfig
						)}
						idPrefix={`setup-${service.id}`}
						triggerTitle={service.title}
						triggerDescription={getSelectionSummary(serviceStates[service.id], service.description)}
						defaultOpen={index === 0}
						onChange={(providerId, modelId) => onServiceChange(service.id, providerId, modelId)}
					/>
				))}
			</div>
		</div>
	);
}
