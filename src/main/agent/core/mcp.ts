import type { ProviderMcpServerSpec } from '../../llm/types';

export abstract class AgentMcp {
	abstract list(providerId: string): ProviderMcpServerSpec[];
}
