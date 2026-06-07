
export abstract class AgentStore {
	abstract getItem<T>(key: string): T | undefined;

	abstract setItem<T>(key: string, value: T): void;
}

export class InMemoryAgentStore extends AgentStore {
	private readonly items = new Map<string, unknown>();

	getItem<T>(key: string): T | undefined {
		return this.items.get(key) as T | undefined;
	}

	setItem<T>(key: string, value: T): void {
		this.items.set(key, value);
	}
}
