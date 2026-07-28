import type { EmbedRequest, RagConfig } from '../rag_types';

export async function embedNomic(
	request: Required<EmbedRequest>,
	config: RagConfig
): Promise<number[][]> {
	const response = await fetch(config.url, {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${config.apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: config.model,
			texts: request.texts,
			task_type: request.inputType === 'query' ? 'search_query' : 'search_document',
		}),
	});
	if (!response.ok) {
		throw new Error(
			`${config.label} embeddings failed (${response.status}): ${response.statusText}`
		);
	}

	const data = (await response.json()) as { embeddings?: number[][] };
	return data.embeddings ?? [];
}
