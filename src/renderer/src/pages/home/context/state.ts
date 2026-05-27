import type {
	AgentRunState,
	ModelReasoningEffort,
	ReasoningSummaryState,
} from '../../../../../shared/agents/service';
import type { AgentCapabilityResolutionSummary } from '../../../../../shared/agents/capabilities';
import type { AgentSkillUsage } from './skill-usage';
import type { AgentToolPart } from './tool-parts';

export type { AgentRunState, AgentToolPart };

export interface UserMessage {
	readonly id: string;
	readonly role: 'user';
	readonly type: 'user';
	readonly content: string;
}

export interface AgentMessage {
	readonly id: string;
	readonly role: 'agent';
	readonly type: 'agent';
	readonly content: string;
	readonly runId?: string;
	readonly state: AgentRunState;
	readonly tools: readonly AgentToolPart[];
	readonly requestedEffort?: ModelReasoningEffort;
	readonly lightContext?: boolean;
	readonly model?: AgentModelSelection;
	readonly reasoning?: readonly AgentReasoningSummary[];
	readonly capability?: AgentCapabilityResolutionSummary;
	readonly selectedSkills?: readonly AgentSkillUsage[];
	readonly errorText?: string;
	readonly startedAtMs?: number;
	readonly completedAtMs?: number;
}

export interface AgentModelSelection {
	readonly providerId: string;
	readonly model: string;
	readonly effort?: ModelReasoningEffort;
}

export interface AgentReasoningSummary {
	readonly id: string;
	readonly title: string;
	readonly summary: string;
	readonly state: ReasoningSummaryState;
}

export type HomeChatMessage = UserMessage | AgentMessage;

export interface AgentChatState {
	readonly messages: readonly HomeChatMessage[];
	readonly activeAgentId?: string;
	readonly activeRunId?: string;
}

export const welcomeMessage: AgentMessage = {
	id: 'agent-welcome',
	role: 'agent',
	type: 'agent',
	content:
		'Ready when you are. Ask Friday to inspect code, make a change, explain a file, or help plan the next step.',
	state: 'idle',
	tools: [],
};

export const initialAgentChatState: AgentChatState = {
	messages: [welcomeMessage],
};
