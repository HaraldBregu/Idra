import { requestEmbeddings } from './embedding_shared';
import type { EmbeddingAdapter, EmbeddingProviderSpec } from './embedding_types';

export function createOpenAiEmbeddingAdapter(spec: EmbeddingProviderSpec): EmbeddingAdapter {
	return {
		async embed(request) {
			const payload = (await requestEmbeddings(
				spec,
				{ model: spec.model, input: request.texts },
				request.signal
			)) as { data?: { embedding?: number[] }[] };
			return (payload.data ?? []).map((item) => item.embedding ?? []);
		},
	};
}
