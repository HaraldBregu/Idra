import { requestEmbeddings } from './embedding_shared';
import type { EmbeddingAdapter, EmbeddingProviderSpec } from './embedding_types';

export function createVoyageEmbeddingAdapter(spec: EmbeddingProviderSpec): EmbeddingAdapter {
	return {
		async embed(request) {
			const payload = (await requestEmbeddings(
				spec,
				{ model: spec.model, input: request.texts, input_type: request.inputType },
				request.signal
			)) as { data?: { embedding?: number[] }[] };
			return (payload.data ?? []).map((item) => item.embedding ?? []);
		},
	};
}
