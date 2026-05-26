import type { AgentRunStreamEvent } from '../../../shared/agents/events';
import type { AgentSelectedSkillSummary } from '../../../shared/agents/capabilities';
import type { AgentTool, AgentToolSelectionForTurn, ToolContext } from '../../tools';

export interface AgentResolvedSkill extends AgentSelectedSkillSummary {
	prompt: string;
}

export interface AgentCapabilityBundle {
	tools: AgentTool[];
	connectorTools: AgentTool[];
	skills: AgentResolvedSkill[];
	promptAdditions: string;
	directAnswer: boolean;
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
