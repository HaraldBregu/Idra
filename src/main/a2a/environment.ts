const REQUIRED_PROVIDER_VARIABLES = ['IDRA_PROVIDER_ID', 'IDRA_MODEL_ID', 'IDRA_API_KEY'] as const;

export function requireProviderEnvironment(): void {
	const missing = REQUIRED_PROVIDER_VARIABLES.filter((name) => !process.env[name]?.trim());
	if (missing.length > 0) {
		throw new Error(`A2A server requires ${missing.join(', ')}.`);
	}
}
