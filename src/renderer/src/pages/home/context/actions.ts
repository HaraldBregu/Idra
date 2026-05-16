import type {
	AgentHistoryMessage,
	AgentResponseEvent,
} from '../../../../../shared/service';
import type { HomeMultiSelectMessage } from './state';

export type AgentChatAction =
	| {
			type: 'submit_user_message';
			userMessageId: string;
			agentMessageId: string;
			content: string;
			submittedAtMs?: number;
	  }
	| { type: 'append_user_message'; messageId: string; content: string }
	| { type: 'apply_response_event'; event: AgentResponseEvent; receivedAtMs: number }
	| { type: 'set_pending_message'; message: HomeMultiSelectMessage | null }
	| { type: 'complete_active'; response: string; completedAtMs?: number }
	| { type: 'cancel_active'; completedAtMs?: number }
	| { type: 'error_active'; errorText: string; completedAtMs?: number }
	| { type: 'restore_history'; history: AgentHistoryMessage[] }
	| { type: 'reset' };
