import type { EmbedRequest, RagConfig } from '../rag_types';

export type EmbedAdapter = (
	request: Required<EmbedRequest>,
	config: RagConfig
) => Promise<number[][]>;
