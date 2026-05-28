import type { AgentCapability, AgentCapabilityServicePort } from './types';

export class AgentCapabilityService implements AgentCapabilityServicePort {
	private capabilities: AgentCapability[] = [];
	constructor(_dependencies: { logger?: { warn(source: string, message: string, data?: unknown): void } } = {}) {}
	list(): AgentCapability[] {
		return [...this.capabilities];
	}
	async refresh(): Promise<AgentCapability[]> {
		return this.list();
	}
}
