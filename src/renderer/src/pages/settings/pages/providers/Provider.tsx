import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type { ProviderEntry, ProviderId } from '../../../../../../shared/types';
import { PROVIDER_IDS, getProvider } from '../../../../../../shared/providers';
import { providersReducer } from './context/reducer';
import {
	EMPTY_DRAFT,
	initialState,
	type DraftProperties,
	type DraftsByProvider,
} from './context/state';

export interface ProvidersContextValue {
	providers: ProviderEntry[];
	drafts: DraftsByProvider;
	persisted: DraftsByProvider;
	saving: ReadonlySet<ProviderId>;
	setProviders: (providers: ProviderEntry[]) => void;
	setDrafts: (drafts: DraftsByProvider) => void;
	patchDraft: (providerId: ProviderId, patch: Partial<DraftProperties>) => void;
	handleSave: (providerId: ProviderId) => Promise<void>;
}

const ProvidersContext = createContext<ProvidersContextValue | null>(null);

export function useProvidersContext(): ProvidersContextValue {
	const context = useContext(ProvidersContext);
	if (!context) {
		throw new Error('useProvidersContext must be used within a ProvidersProvider');
	}
	return context;
}

interface ProvidersProviderProps {
	readonly children: ReactNode;
}

export function ProvidersProvider({ children }: ProvidersProviderProps): ReactElement {
	const [state, dispatch] = useReducer(providersReducer, initialState);

	const persisted = useMemo<DraftsByProvider>(() => {
		const map = {} as DraftsByProvider;
		for (const id of PROVIDER_IDS) {
			const found = state.providers.find((p) => p.id === id);
			map[id] = found ? { apiKey: found.apiKey, model: found.model } : EMPTY_DRAFT;
		}
		return map;
	}, [state.providers]);

	const setProviders = useCallback((providers: ProviderEntry[]) => {
		dispatch({ type: 'SET_PROVIDERS', payload: providers });
	}, []);

	const setDrafts = useCallback((drafts: DraftsByProvider) => {
		dispatch({ type: 'SET_DRAFTS', payload: drafts });
	}, []);

	const patchDraft = useCallback(
		(providerId: ProviderId, patch: Partial<DraftProperties>) => {
			dispatch({ type: 'PATCH_DRAFT', providerId, payload: patch });
		},
		[]
	);

	const handleSave = useCallback(
		async (providerId: ProviderId) => {
			const draft = state.drafts[providerId];
			const persistedForId = persisted[providerId];
			const apiKey = draft.apiKey.trim();
			const model = draft.model.trim();
			if (apiKey === persistedForId.apiKey && model === persistedForId.model) return;

			const catalog = getProvider(providerId);
			if (!catalog) return;

			dispatch({ type: 'SET_SAVING', providerId, payload: true });
			try {
				if (apiKey.length === 0) {
					await window.app.deleteProvider(catalog.id);
				} else {
					await window.app.addProvider({ id: catalog.id, name: catalog.name, apiKey, model });
				}
				const reloaded = await window.app.getProviders();
				dispatch({ type: 'SET_PROVIDERS', payload: reloaded });
			} finally {
				dispatch({ type: 'SET_SAVING', providerId, payload: false });
			}
		},
		[state.drafts, persisted]
	);

	const value: ProvidersContextValue = {
		providers: state.providers,
		drafts: state.drafts,
		persisted,
		saving: state.saving,
		setProviders,
		setDrafts,
		patchDraft,
		handleSave,
	};

	return <ProvidersContext.Provider value={value}>{children}</ProvidersContext.Provider>;
}
