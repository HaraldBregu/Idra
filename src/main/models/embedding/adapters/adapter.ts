import type { EmbeddingConfig, EmbeddingRequest } from '../embedding_types';

export type EmbeddingAdapter = (
	request: Required<EmbeddingRequest>,
	config: EmbeddingConfig
) => Promise<number[][]>;
