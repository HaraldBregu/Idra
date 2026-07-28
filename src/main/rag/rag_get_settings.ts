import { getRagConfig } from './rag_get_config';
import { ragStore } from './rag_store';
import { RAG_PROVIDER_IDS, type RagProviderId, type RagSettings } from './rag_types';

export function getRagSettings(): RagSettings {
	const rawProviderId = ragStore.get('providerId') as unknown;
	const providerId =
		typeof rawProviderId === 'string' &&
		RAG_PROVIDER_IDS.includes(rawProviderId as RagProviderId)
			? (rawProviderId as RagProviderId)
			: 'openai';
	const configured = Object.fromEntries(
		RAG_PROVIDER_IDS.map((id) => {
			const config = getRagConfig(id);
			return [id, config.local || config.apiKey.length > 0];
		})
	) as Record<RagProviderId, boolean>;

	return { providerId, configured };
}
