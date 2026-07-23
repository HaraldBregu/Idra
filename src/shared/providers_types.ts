export interface Provider {
	name: string;
	apiKey: string;
	baseUrl: string;
}

export type ProviderRecord = Record<string, Provider>;

export interface ResolvedProvider {
	id: string;
	apiKey: string;
	baseURL: string;
}
