import type { ModelServiceId, ModelServiceStateMap, ProviderSetupEntry, SetupStep } from '../types';

export type SetupAction =
	| { type: 'GO_TO_STEP'; step: SetupStep }
	| { type: 'SET_ERROR'; message: string }
	| { type: 'CLEAR_ERROR' }
	| { type: 'UPDATE_PROVIDER_ENTRY'; providerId: string; patch: Partial<ProviderSetupEntry> }
	| { type: 'MERGE_PROVIDER_SAVED_STATUS'; savedStatus: Record<string, boolean> }
	| { type: 'MARK_PROVIDERS_SAVED'; providerIds: readonly string[] }
	| { type: 'SET_SAVING_PROVIDER'; providerId: string | null }
	| { type: 'SET_LOADING_MODELS'; loading: boolean }
	| { type: 'LOAD_SERVICE_STATES'; states: ModelServiceStateMap }
	| { type: 'CHANGE_SERVICE_PROVIDER'; serviceId: ModelServiceId; providerId: string; modelId: string }
	| { type: 'CHANGE_SERVICE_MODEL'; serviceId: ModelServiceId; modelId: string }
	| { type: 'SET_SAVING_CONFIG'; saving: boolean };
