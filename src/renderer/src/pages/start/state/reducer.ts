import { actionableProviderCatalog, createInitialModelServiceState } from '../constants';
import type { SetupAction } from './actions';
import type { SetupState } from './types';

export const initialSetupState: SetupState = {
	step: 'presentation',
	providerEntries: actionableProviderCatalog.map((provider, index) => ({
		providerId: provider.id,
		apiKey: '',
		apiKeySaved: false,
		editing: index === 0,
	})),
	savingProviderId: null,
	serviceStates: createInitialModelServiceState(),
	loadingModels: false,
	savingConfig: false,
	errorMessage: '',
};

export function setupReducer(state: SetupState, action: SetupAction): SetupState {
	switch (action.type) {
		case 'GO_TO_STEP':
			return { ...state, step: action.step, errorMessage: '' };

		case 'SET_ERROR':
			return { ...state, errorMessage: action.message };

		case 'CLEAR_ERROR':
			return { ...state, errorMessage: '' };

		case 'UPDATE_PROVIDER_ENTRY':
			return {
				...state,
				providerEntries: state.providerEntries.map((entry) =>
					entry.providerId === action.providerId ? { ...entry, ...action.patch } : entry
				),
			};

		case 'MERGE_PROVIDER_SAVED_STATUS': {
			const hasSavedProvider = Object.values(action.savedStatus).some(Boolean);
			return {
				...state,
				providerEntries: actionableProviderCatalog.map((provider, index) => {
					const current = state.providerEntries.find((e) => e.providerId === provider.id);
					const saved = action.savedStatus[provider.id] ?? false;
					const draft = current?.apiKey ?? '';
					const hasDraft = draft.trim().length > 0;
					return {
						providerId: provider.id,
						apiKey: draft,
						apiKeySaved: saved,
						editing: hasDraft
							? (current?.editing ?? false)
							: saved
								? false
								: (current?.editing ?? (!hasSavedProvider && index === 0)),
					};
				}),
			};
		}

		case 'MARK_PROVIDERS_SAVED': {
			const savedSet = new Set(action.providerIds);
			return {
				...state,
				providerEntries: state.providerEntries.map((entry) =>
					savedSet.has(entry.providerId)
						? { ...entry, apiKey: '', apiKeySaved: true, editing: false }
						: entry
				),
			};
		}

		case 'SET_SAVING_PROVIDER':
			return { ...state, savingProviderId: action.providerId };

		case 'SET_LOADING_MODELS':
			return { ...state, loadingModels: action.loading };

		case 'LOAD_SERVICE_STATES':
			return { ...state, serviceStates: action.states };

		case 'CHANGE_SERVICE_PROVIDER':
			return {
				...state,
				serviceStates: {
					...state.serviceStates,
					[action.serviceId]: {
						...state.serviceStates[action.serviceId],
						providerId: action.providerId,
						modelId: action.modelId,
					},
				},
			};

		case 'CHANGE_SERVICE_MODEL':
			return {
				...state,
				serviceStates: {
					...state.serviceStates,
					[action.serviceId]: {
						...state.serviceStates[action.serviceId],
						modelId: action.modelId,
					},
				},
			};

		case 'SET_SAVING_CONFIG':
			return { ...state, savingConfig: action.saving };

		default:
			return state;
	}
}
