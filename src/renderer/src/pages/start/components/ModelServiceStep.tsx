import React from 'react';
import { LoaderCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ModelProviderSelect, toModelProviderGroups } from '@/components/model-provider-select';
import type { ModelServiceDefinition, ModelServiceId, ModelServiceState } from '../types';

type ModelServiceStepProps = {
	readonly service: ModelServiceDefinition;
	readonly serviceState: ModelServiceState;
	readonly loadingModels: boolean;
	readonly savingConfig: boolean;
	readonly onProviderChange: (serviceId: ModelServiceId, value: string | null) => void;
	readonly onModelChange: (serviceId: ModelServiceId, value: string | null) => void;
};

export function ModelServiceStep({
	service,
	serviceState,
	loadingModels,
	savingConfig,
	onProviderChange,
	onModelChange,
}: ModelServiceStepProps): React.JSX.Element {
	const ServiceIcon = service.icon;
	const noModels = !loadingModels && serviceState.modelGroups.length === 0;

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
				<ModelProviderSelect
					idPrefix={service.id}
					providerGroups={toModelProviderGroups(serviceState.modelGroups)}
					providerId={serviceState.providerId}
					modelId={serviceState.modelId}
					onProviderChange={(value) => onProviderChange(service.id, value)}
					onModelChange={(value) => onModelChange(service.id, value)}
					disabled={loadingModels || serviceState.modelGroups.length === 0 || savingConfig}
					labels={{
						providerPlaceholder: loadingModels
							? 'Loading...'
							: noModels
								? 'No providers'
								: 'Select provider',
						modelPlaceholder: loadingModels
							? 'Loading...'
							: noModels
								? 'No models'
								: 'Select model',
					}}
				/>
			</div>

			{loadingModels ? (
				<div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
					<LoaderCircle className="size-3.5 animate-spin" />
					<span>Loading compatible models...</span>
				</div>
			) : null}

			{noModels ? (
				<p className="mt-4 text-xs text-muted-foreground">
					Connect a compatible provider to choose a model for this step.
				</p>
			) : null}
		</div>
	);
}
