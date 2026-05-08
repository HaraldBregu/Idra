import type { ProviderEntry, ProviderId } from '../../../../../../../shared/types';
import { PROVIDER_IDS } from '../../../../../../../shared/providers';

export interface DraftProperties {
	readonly apiKey: string;
	readonly model: string;
}

export const EMPTY_DRAFT: DraftProperties = { apiKey: '', model: '' };

export type DraftsByProvider = Record<ProviderId, DraftProperties>;

function emptyDrafts(): DraftsByProvider {
	const map = {} as DraftsByProvider;
	for (const id of PROVIDER_IDS) map[id] = EMPTY_DRAFT;
	return map;
}

export interface ProvidersState {
	providers: ProviderEntry[];
	drafts: DraftsByProvider;
	saving: ReadonlySet<ProviderId>;
}

export const initialState: ProvidersState = {
	providers: [],
	drafts: emptyDrafts(),
	saving: new Set(),
};
