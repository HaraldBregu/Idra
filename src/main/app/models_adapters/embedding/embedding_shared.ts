import type { EmbeddingProviderSpec } from './embedding_types';

export async function requestEmbeddings(
	spec: EmbeddingProviderSpec,
	body: Record<string, unknown>,
	signal?: AbortSignal
): Promise<unknown> {
	const headers: Record<string, string> = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
	};
	if (spec.apiKey) headers.Authorization = `Bearer ${spec.apiKey}`;

	const response = await fetch(spec.baseURL, {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
		signal,
	});
	if (!response.ok) {
		throw new Error(`${spec.name} embeddings failed (${response.status}): ${response.statusText}`);
	}
	return response.json();
}
