import { Assistant } from './assistant';

/**
 * Registry of initialized assistants, keyed by id.
 */
export class AssistantRegistry {
	private readonly assistants = new Map<string, Assistant>();

	register(assistant: Assistant): Assistant {
		if (this.assistants.has(assistant.id)) {
			throw new Error(`Assistant already registered: ${assistant.id}`);
		}
		this.assistants.set(assistant.id, assistant);
		return assistant;
	}

	get(id: string): Assistant {
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
