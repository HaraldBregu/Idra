import path from 'node:path';
import Store from 'electron-store';
import { userDataLocation } from '../shared/user_data_location';
import type { RagProviderId, RagProviderInput } from './rag_types';

export interface RagStoreState {
	providerId: RagProviderId;
	providers: Record<RagProviderId, RagProviderInput>;
}

export const DEFAULT_RAG_STORE: RagStoreState = {
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

export const ragStore = new Store<RagStoreState>({
	name: 'settings',
	cwd: path.resolve(userDataLocation(), 'rag'),
	accessPropertiesByDotNotation: false,
	defaults: DEFAULT_RAG_STORE,
});
