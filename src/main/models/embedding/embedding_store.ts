import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../../shared/user_data_location';
import type { EmbeddingProviderId, EmbeddingProviderInput } from './embedding_types';

export interface EmbeddingStoreState {
	providerId: EmbeddingProviderId;
	providers: Record<EmbeddingProviderId, EmbeddingProviderInput>;
}

export const DEFAULT_EMBEDDING_STORE: EmbeddingStoreState = {
	providerId: 'openai',
	providers: {
		openai: { apiKey: '' },
		cohere: { apiKey: '' },
		voyage: { apiKey: '' },
		bge: { apiKey: '' },
		nomic: { apiKey: '' },
		jina: { apiKey: '' },
	},
};

export const embeddingStore = new Store<EmbeddingStoreState>({
	name: 'settings',
	cwd: path.resolve(userDataLocation(), 'models', 'embedding'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_EMBEDDING_STORE,
});
