import type { EmbedRequest, RagConfig } from '../rag_types';

export async function embedCompatible(
	request: Required<EmbedRequest>,
	config: RagConfig
): Promise<number[][]> {
	const body: Record<string, unknown> = { model: config.model, input: request.texts };
	if (config.inputType) body[config.inputType.field] = config.inputType[request.inputType];

	const headers: Record<string, string> = {
		Accept: 'application/json',
		'Content-Type': 'application/json',
	};
	if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;

	const response = await fetch(config.url, { method: 'POST', headers, body: JSON.stringify(body) });
	if (!response.ok) {
		throw new Error(
			`${config.label} embeddings failed (${response.status}): ${response.statusText}`
		);
	}

	const data = (await response.json()) as { data?: { embedding?: number[] }[] };
	return (data.data ?? []).map((item) => item.embedding ?? []);
}
