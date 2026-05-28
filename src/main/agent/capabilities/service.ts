import type { AgentCapability, AgentCapabilityServicePort } from './types';
import { assistant } from '../../../shared/agents/assistant';

export class AgentCapabilityService implements AgentCapabilityServicePort {
	private capabilities: AgentCapability[] = assistant.tools.map((tool) => ({
		id: tool.name,
		name: tool.title,
		kind: 'tool',
		description: tool.description,
	}));
	constructor(_dependencies: { logger?: { warn(source: string, message: string, data?: unknown): void } } = {}) {}
	list(): AgentCapability[] {
		return [...this.capabilities];
	}
	async refresh(): Promise<AgentCapability[]> {
		return this.list();
	}
}
