import type { AgentCapabilityServiceKind } from './constants';

export interface AgentSelectedSkillSummary {
	name: string;
	reason: string;
}

export type AgentCapabilityDecisionMode =
	| 'direct_answer'
	| 'use_tools'
	| 'use_skills'
	| 'use_tools_and_skills';

export interface AgentCapabilityDecisionSummary {
	mode: AgentCapabilityDecisionMode;
	reason: string;
}

export interface AgentCapabilityResolutionSummary {
	tools: string[];
	connectorTools: string[];
	skills: AgentSelectedSkillSummary[];
	directAnswer: boolean;
	decision: AgentCapabilityDecisionSummary;
}

export interface AgentToolCapabilitySummary {
	name: string;
	displayName?: string;
	serviceKind: AgentCapabilityServiceKind;
	serviceId?: string;
}
