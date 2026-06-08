export abstract class Settings {
	abstract getProviderId(): string | undefined;
	abstract getModelId(): string | undefined;
}
