import { requestEmbeddings } from './embedding_shared';
import type { EmbeddingAdapter, EmbeddingProviderSpec } from './embedding_types';

export function createJinaEmbeddingAdapter(spec: EmbeddingProviderSpec): EmbeddingAdapter {
	return {
		async embed(request) {
			const payload = (await requestEmbeddings(
				spec,
				{
					model: spec.model,
					input: request.texts,
					task: request.inputType === 'query' ? 'retrieval.query' : 'retrieval.passage',
				},
				request.signal
			)) as { data?: { embedding?: number[] }[] };
			return (payload.data ?? []).map((item) => item.embedding ?? []);
		},
	};
}
