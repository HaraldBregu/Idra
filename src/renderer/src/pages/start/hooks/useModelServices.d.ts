import type { Dispatch } from 'react';
import type { ModelServiceDefinition, ModelServiceId } from '../types';
import type { SetupAction } from '../state/actions';
import type { SetupState } from '../state/types';
export declare function useModelServices(state: SetupState, dispatch: Dispatch<SetupAction>, connectedProviderIds: ReadonlySet<string>, navigate: (path: string) => void): {
    handleServiceProviderChange: (serviceId: ModelServiceId, value: string | null) => void;
    handleServiceModelChange: (serviceId: ModelServiceId, value: string | null) => void;
    handleSaveModelStep: (service: ModelServiceDefinition, stepIndex: number) => Promise<void>;
};
