import type { ApprovalDecision, AgentRunState } from '../../../../../shared/service';
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
	readonly errorText?: string;
	readonly startedAtMs?: number;
	readonly completedAtMs?: number;
}

export interface HomeMultiSelectOption {
	readonly id: string;
	readonly kind: 'approval' | 'input';
	readonly label: string;
	readonly description: string;
	readonly subject?: string;
	readonly meta?: string;
	readonly paths?: readonly string[];
	readonly approvalId?: string;
	readonly decision?: ApprovalDecision;
	readonly inputId?: string;
}

export interface HomeMultiSelectMessage {
	readonly id: string;
	readonly role: 'agent';
	readonly type: 'multi-select';
	readonly prompt: string;
	readonly options: readonly HomeMultiSelectOption[];
}

export interface ImmediateApprovalSelection {
	readonly approvalId: string;
	readonly decision: ApprovalDecision;
	readonly optionId: string;
}

export type HomeChatMessage = UserMessage | AgentMessage | HomeMultiSelectMessage;

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

export function inputAnswerKey(messageId: string, inputId: string): string {
	return `${messageId}:${inputId}`;
}
