import React from 'react';
import { LoaderCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { getProviderCatalogItem } from '../constants';
import type { ModelServiceDefinition, ModelServiceId, ModelServiceState } from '../types';
import { StepField } from './StepField';

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
	const availableModels =
		serviceState.modelGroups.find((g) => g.provider.id === serviceState.providerId)?.models ?? [];
	const noModels = !loadingModels && serviceState.modelGroups.length === 0;

	return (
		<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col justify-center px-4 py-8 sm:px-6">
			<div className="mb-5 flex size-16 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm">
				<ServiceIcon className="size-8" strokeWidth={1.7} aria-hidden="true" />
			</div>

			<div className="flex items-start justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold leading-tight tracking-normal text-foreground">
						{service.stepTitle}
					</h1>
					<p className="mt-2 max-w-xl text-xs font-medium leading-relaxed text-muted-foreground">
						{service.stepDescription}
					</p>
				</div>
				<Badge
					variant={service.required ? 'default' : 'secondary'}
					className="mt-1 shrink-0"
				>
					{service.required ? 'Required' : 'Optional'}
				</Badge>
			</div>

			<div className="mt-6 grid gap-3 sm:grid-cols-2">
				<StepField id={`${service.id}-provider`} label="Provider">
					<Select
						value={serviceState.providerId}
						onValueChange={(value) => onProviderChange(service.id, value)}
						disabled={loadingModels || serviceState.modelGroups.length === 0 || savingConfig}
					>
						<SelectTrigger id={`${service.id}-provider`} className="w-full text-xs">
							<SelectValue
								placeholder={
									loadingModels ? 'Loading...' : noModels ? 'No providers' : 'Select provider'
								}
							/>
						</SelectTrigger>
						<SelectContent>
							{serviceState.modelGroups.map((group) => (
								<SelectItem key={group.provider.id} value={group.provider.id}>
									{getProviderCatalogItem(group.provider.id).name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</StepField>

				<StepField id={`${service.id}-model`} label="Model">
					<Select
						value={serviceState.modelId}
						onValueChange={(value) => onModelChange(service.id, value)}
						disabled={loadingModels || availableModels.length === 0 || savingConfig}
					>
						<SelectTrigger id={`${service.id}-model`} className="w-full text-xs">
							<SelectValue
								placeholder={
									loadingModels ? 'Loading...' : noModels ? 'No models' : 'Select model'
								}
							/>
						</SelectTrigger>
						<SelectContent>
							{availableModels.map((model) => (
								<SelectItem key={model.id} value={model.id}>
									{model.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</StepField>
			</div>

			{loadingModels ? (
				<div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
					<LoaderCircle className="size-3.5 animate-spin" />
					<span>Checking connected providers for compatible models.</span>
				</div>
			) : null}
		</div>
	);
}
