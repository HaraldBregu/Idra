import { createContext, type Dispatch } from 'react';
import type { AgentChatAction } from './actions';
import type { AgentChatState } from './state';

export interface HomeAgentContextValue {
	readonly chatState: AgentChatState;
	readonly dispatchChat: Dispatch<AgentChatAction>;
}

export const HomeAgentContext = createContext<HomeAgentContextValue | null>(null);
