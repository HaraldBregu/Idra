export interface Provider {
	id: string,
	apiKey: string,
	baseURL: string,
}

export abstract class Settings {
	abstract getProvider(): Provider | undefined;
	abstract setProvider(provider: Provider);
	abstract getProviderId(): string | undefined;
	abstract getModelId(): string | undefined;
	abstract setModelId(modelId: string);
}
