import type { AgentCapabilityServiceKind } from './constants';

export interface AgentSelectedSkillSummary {
	name: string;
	reason: string;
}

export type AgentIntentResolutionStatus =
	| 'recognized'
	| 'ambiguous'
	| 'missing_slots'
	| 'unknown';

export interface AgentIntentAlternativeSummary {
	name: string;
	confidence?: number;
	reason?: string;
}

export interface AgentIntentSlotSummary {
	name: string;
	value?: unknown;
	missing?: boolean;
	reason?: string;
}

export interface AgentIntentResolutionSummary {
	name: string;
	status: AgentIntentResolutionStatus;
	confidence?: number;
	reason?: string;
	alternatives?: AgentIntentAlternativeSummary[];
	slots?: AgentIntentSlotSummary[];
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

export interface AgentCapabilityServiceSummary {
	name: string;
	serviceKind: AgentCapabilityServiceKind;
	serviceId?: string;
	displayName?: string;
}

export interface AgentRouteResolutionSummary {
	target: AgentCapabilityDecisionMode;
	reason: string;
	serviceKinds?: AgentCapabilityServiceKind[];
	requiredApprovals?: string[];
}

export interface AgentCapabilityResolutionSummary {
	tools: string[];
	services?: AgentCapabilityServiceSummary[];
	skills: AgentSelectedSkillSummary[];
	directAnswer: boolean;
	decision: AgentCapabilityDecisionSummary;
	intent?: AgentIntentResolutionSummary;
	route?: AgentRouteResolutionSummary;
}

export interface AgentToolCapabilitySummary {
	name: string;
	displayName?: string;
	serviceKind: AgentCapabilityServiceKind;
	serviceId?: string;
}
