/**
 * Generic registry keyed by agent/runtime id.
 */
export class AgentRegistry<T extends { id: string }> {
	private readonly agents = new Map<string, T>();

	register(agent: T): T {
		if (this.agents.has(agent.id)) {
			throw new Error(`Agent already registered: ${agent.id}`);
		}
		this.agents.set(agent.id, agent);
		return agent;
	}

	get(id: string): T {
		const a = this.agents.get(id);
		if (!a) throw new Error(`Unknown agent: ${id}`);
		return a;
	}

	has(id: string): boolean {
		return this.agents.has(id);
	}

	list(): string[] {
		return Array.from(this.agents.keys());
	}
}
