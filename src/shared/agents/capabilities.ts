import type { AgentCapabilityServiceKind } from './constants';

export interface AgentSelectedSkillSummary {
	name: string;
	reason: string;
}

export interface AgentCapabilityResolutionSummary {
	tools: string[];
	connectorTools: string[];
	skills: AgentSelectedSkillSummary[];
	directAnswer: boolean;
}

export interface AgentToolCapabilitySummary {
	name: string;
	displayName?: string;
	serviceKind: AgentCapabilityServiceKind;
	serviceId?: string;
}
