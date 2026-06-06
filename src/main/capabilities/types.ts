import type { AgentRunStreamEvent } from '../../shared/agents/events';
import type {
	AgentCapabilityDecisionSummary,
	AgentSelectedSkillSummary,
} from '../../shared/agents/capabilities';
import type { AgentTool, ToolContext } from '../tools/core/tool';
import type { AgentToolSelectionForTurn } from '../tools/core/shared/management';

export interface AgentResolvedSkill extends AgentSelectedSkillSummary {
	prompt: string;
}

export interface AgentCapabilityBundle {
	tools: AgentTool[];
	skills: AgentResolvedSkill[];
	promptAdditions: string;
	directAnswer: boolean;
	decision: AgentCapabilityDecisionSummary;
	toolSelection?: AgentToolSelectionForTurn;
}

export interface AgentCapabilityResolveInput {
	userMessage: string;
	localTools: AgentTool[];
	ctx: ToolContext;
	providerId: string;
	model: string;
	shouldUseTools: boolean;
	bootstrapPending: boolean;
	directAnswer: boolean;
	configuredSkillNames?: string[];
	streamEvent?: (event: AgentRunStreamEvent) => void;
}

export interface AgentCapabilityServicePort {
	resolveForPrompt(input: AgentCapabilityResolveInput): Promise<AgentCapabilityBundle>;
}
