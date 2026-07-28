import { getEmbeddingConfig } from './embedding_get_config';
import { embeddingStore } from './embedding_store';
import {
	EMBEDDING_PROVIDER_IDS,
	type EmbeddingProviderId,
	type EmbeddingSettings,
} from './embedding_types';

export function getEmbeddingSettings(): EmbeddingSettings {
	const rawProviderId = embeddingStore.get('providerId') as unknown;
	const providerId =
		typeof rawProviderId === 'string' &&
		EMBEDDING_PROVIDER_IDS.includes(rawProviderId as EmbeddingProviderId)
			? (rawProviderId as EmbeddingProviderId)
			: 'openai';
	const configured = Object.fromEntries(
		EMBEDDING_PROVIDER_IDS.map((id) => {
			const config = getEmbeddingConfig(id);
			return [id, config.local || config.apiKey.length > 0];
		})
	) as Record<EmbeddingProviderId, boolean>;

	return { providerId, configured };
}
