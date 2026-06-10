import type { Provider } from '../types'

export type { Provider }

export abstract class Settings {
	abstract getProvider(): Provider | undefined;
	abstract setProvider(provider: Provider);
	abstract getProviderId(): string | undefined;
	abstract getModelId(): string | undefined;
	abstract setModelId(modelId: string);
}
