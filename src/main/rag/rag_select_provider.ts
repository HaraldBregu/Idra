import { getRagSettings } from './rag_get_settings';
import { ragStore } from './rag_store';
import { RAG_PROVIDER_IDS, type RagProviderId, type RagSettings } from './rag_types';

export function selectRagProvider(providerId: RagProviderId): RagSettings {
	if (!RAG_PROVIDER_IDS.includes(providerId)) throw new Error('Unknown embedding provider.');
	if (!getRagSettings().configured[providerId]) {
		throw new Error('Configure this embedding provider before selecting it.');
	}
	ragStore.set('providerId', providerId);
	return getRagSettings();
}
