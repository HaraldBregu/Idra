import type { AgentCapability, AgentCapabilityServicePort } from './types';
import { assistant } from '../../../shared/agents/assistant';
import type { ConnectorsService } from '../../connectors';
import type { SkillsService } from '../../skills';
import { resolveAgentCapabilities, type ResolvedAgentCapabilities } from './resolve';
import type { AgentCapabilityResolveInput } from './types';

export interface AgentCapabilityServiceDependencies {
	connectors?: Pick<ConnectorsService, 'list' | 'refreshTools' | 'searchTools' | 'execTool'>;
	skills?: Pick<SkillsService, 'search' | 'load'>;
	logger?: { warn(source: string, message: string, data?: unknown): void };
}

export class AgentCapabilityService implements AgentCapabilityServicePort {
	private capabilities: AgentCapability[] = assistant.tools.map((tool) => ({
		id: tool.name,
		name: tool.label,
		kind: 'tool',
		description: tool.description,
	}));
	constructor(private readonly dependencies: AgentCapabilityServiceDependencies = {}) {}
	list(): AgentCapability[] {
		return [...this.capabilities];
	}
	async refresh(): Promise<AgentCapability[]> {
		return this.list();
	}
	resolveForPrompt(input: AgentCapabilityResolveInput): Promise<ResolvedAgentCapabilities> {
		return resolveAgentCapabilities({
			...input,
			connectors: this.dependencies.connectors,
			skills: this.dependencies.skills,
		});
	}
}
