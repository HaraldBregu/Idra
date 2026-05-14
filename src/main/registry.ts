/**
 * Generic registry keyed by assistant/runtime id.
 */
export class AssistantRegistry<T extends { id: string }> {
	private readonly assistants = new Map<string, T>();

	register(assistant: T): T {
		if (this.assistants.has(assistant.id)) {
			throw new Error(`Assistant already registered: ${assistant.id}`);
		}
		this.assistants.set(assistant.id, assistant);
		return assistant;
	}

	get(id: string): T {
		const a = this.assistants.get(id);
		if (!a) throw new Error(`Unknown assistant: ${id}`);
		return a;
	}

	has(id: string): boolean {
		return this.assistants.has(id);
	}

	list(): string[] {
		return Array.from(this.assistants.keys());
	}
}
