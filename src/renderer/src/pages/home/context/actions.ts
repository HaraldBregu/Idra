import type {
	AssistantHistoryMessage,
	AssistantResponseEvent,
} from '../../../../../shared/service';
import type { HomeMultiSelectMessage } from './state';

export type AssistantChatAction =
	| {
			type: 'submit_user_message';
			userMessageId: string;
			assistantMessageId: string;
			content: string;
	  }
	| { type: 'append_user_message'; messageId: string; content: string }
	| { type: 'apply_response_event'; event: AssistantResponseEvent; receivedAtMs: number }
	| { type: 'set_pending_message'; message: HomeMultiSelectMessage | null }
	| { type: 'complete_active'; response: string }
	| { type: 'cancel_active' }
	| { type: 'error_active'; errorText: string }
	| { type: 'restore_history'; history: AssistantHistoryMessage[] }
	| { type: 'reset' };
