export interface ServerConfig {
	port: number;
	providerId: string;
	modelId: string;
	apiKey: string;
	baseUrl: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
	const providerId = env.IDRA_PROVIDER_ID?.trim();
	const modelId = env.IDRA_MODEL_ID?.trim();
	const apiKey = env.IDRA_API_KEY?.trim();
	const port = Number(env.PORT ?? env.IDRA_PORT ?? 3000);

	if (!providerId) throw new Error('IDRA_PROVIDER_ID is required.');
	if (!modelId) throw new Error('IDRA_MODEL_ID is required.');
	if (!apiKey) throw new Error('IDRA_API_KEY is required.');
	if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
		throw new Error('PORT must be an integer between 1 and 65535.');
	}

	return {
		port,
		providerId,
		modelId,
		apiKey,
		baseUrl: env.IDRA_BASE_URL?.trim() ?? '',
	};
}
