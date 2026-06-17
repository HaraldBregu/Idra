import React from 'react';
import type { ModelServiceDefinition, ModelServiceId, ModelServiceState } from '../types';
type ModelServiceStepProps = {
    readonly service: ModelServiceDefinition;
    readonly serviceState: ModelServiceState;
    readonly loadingModels: boolean;
    readonly savingConfig: boolean;
    readonly onProviderChange: (serviceId: ModelServiceId, value: string | null) => void;
    readonly onModelChange: (serviceId: ModelServiceId, value: string | null) => void;
};
export declare function ModelServiceStep({ service, serviceState, loadingModels, savingConfig, onProviderChange, onModelChange, }: ModelServiceStepProps): React.JSX.Element;
export {};
