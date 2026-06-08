export type SettingsProvider = {
	id: string;
	apiKey: string;
	baseURL: string;
};

export abstract class Settings {
	abstract getProvider(): SettingsProvider | undefined;
	abstract getProviderId(): string | undefined;
	abstract getModelId(): string | undefined;
}
