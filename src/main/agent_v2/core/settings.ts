export abstract class AgentSettings {
	abstract getProviderId(): string | undefined;
	abstract getModelId(): string | undefined;
}
