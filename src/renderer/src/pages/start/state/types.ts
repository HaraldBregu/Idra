import type { ModelServiceStateMap, ProviderSetupEntry, SetupStep, SpeechModeStateMap } from '../types';

export type SetupState = {
	step: SetupStep;
	providerEntries: ProviderSetupEntry[];
	savingProviderId: string | null;
	serviceStates: ModelServiceStateMap;
	speechModeStates: SpeechModeStateMap;
	loadingModels: boolean;
	savingConfig: boolean;
	errorMessage: string;
};
