export interface Provider {
	name: string;
	apiKey: string;
	baseUrl: string;
}

export type ProviderRecord = Record<string, Provider>;
