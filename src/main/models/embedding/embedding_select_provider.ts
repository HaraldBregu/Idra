import { getEmbeddingSettings } from './embedding_get_settings';
import { embeddingStore } from './embedding_store';
import {
	EMBEDDING_PROVIDER_IDS,
	type EmbeddingProviderId,
	type EmbeddingSettings,
} from './embedding_types';

export function selectEmbeddingProvider(providerId: EmbeddingProviderId): EmbeddingSettings {
	if (!EMBEDDING_PROVIDER_IDS.includes(providerId)) throw new Error('Unknown embedding provider.');
	if (!getEmbeddingSettings().configured[providerId]) {
		throw new Error('Configure this embedding provider before selecting it.');
	}
	embeddingStore.set('providerId', providerId);
	return getEmbeddingSettings();
}
