import type {
	AgentHistoryMessage,
	AgentResponseEvent,
	ModelReasoningEffort,
} from '../../../../../shared/agents/service';

export type AgentChatAction =
	| {
			type: 'submit_user_message';
			userMessageId: string;
			agentMessageId: string;
			content: string;
			submittedAtMs?: number;
			reasoningEffort?: ModelReasoningEffort;
			lightContext?: boolean;
	  }
	| { type: 'append_user_message'; messageId: string; content: string }
	| { type: 'apply_response_event'; event: AgentResponseEvent; receivedAtMs: number }
	| { type: 'complete_active'; response: string; completedAtMs?: number }
	| { type: 'cancel_active'; completedAtMs?: number }
	| { type: 'error_active'; errorText: string; completedAtMs?: number }
	| { type: 'restore_history'; history: AgentHistoryMessage[] }
	| { type: 'reset' };
