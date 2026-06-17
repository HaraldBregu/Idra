import type { AgentHistoryMessage } from '@/lib/compat';
import type { AgentChatAction } from './actions';
import { type AgentChatState, type HomeChatMessage } from './state';
export declare function historyToChatMessages(history: AgentHistoryMessage[]): HomeChatMessage[];
export declare function agentChatReducer(state: AgentChatState, action: AgentChatAction): AgentChatState;
