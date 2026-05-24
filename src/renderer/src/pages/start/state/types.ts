import type { ModelServiceStateMap, ProviderSetupEntry, SetupStep } from '../types';

export type SetupState = {
	step: SetupStep;
	providerEntries: ProviderSetupEntry[];
	savingProviderId: string | null;
	serviceStates: ModelServiceStateMap;
	loadingModels: boolean;
	savingConfig: boolean;
	errorMessage: string;
};
