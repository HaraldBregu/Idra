import type { ApprovalDecision, AssistantRunState } from '../../../../../shared/service';
import type { AssistantToolPart } from './tool-parts';

export type { AssistantRunState, AssistantToolPart };

export interface UserMessage {
	readonly id: string;
	readonly role: 'user';
	readonly type: 'user';
	readonly content: string;
}

export interface AssistantMessage {
	readonly id: string;
	readonly role: 'assistant';
	readonly type: 'assistant';
	readonly content: string;
	readonly runId?: string;
	readonly state: AssistantRunState;
	readonly tools: readonly AssistantToolPart[];
	readonly errorText?: string;
	readonly startedAtMs?: number;
	readonly completedAtMs?: number;
}

export interface HomeMultiSelectOption {
	readonly id: string;
	readonly kind: 'approval' | 'input';
	readonly label: string;
	readonly description: string;
	readonly approvalId?: string;
	readonly decision?: ApprovalDecision;
	readonly inputId?: string;
}

export interface HomeMultiSelectMessage {
	readonly id: string;
	readonly role: 'assistant';
	readonly type: 'multi-select';
	readonly prompt: string;
	readonly options: readonly HomeMultiSelectOption[];
}

export type HomeChatMessage = UserMessage | AssistantMessage | HomeMultiSelectMessage;

export interface AssistantChatState {
	readonly messages: readonly HomeChatMessage[];
	readonly activeAssistantId?: string;
	readonly activeRunId?: string;
}

export const welcomeMessage: AssistantMessage = {
	id: 'assistant-welcome',
	role: 'assistant',
	type: 'assistant',
	content:
		'Ready when you are. Ask Friday to inspect code, make a change, explain a file, or help plan the next step.',
	state: 'idle',
	tools: [],
};

export const initialAssistantChatState: AssistantChatState = {
	messages: [welcomeMessage],
};

export function inputAnswerKey(messageId: string, inputId: string): string {
	return `${messageId}:${inputId}`;
}
