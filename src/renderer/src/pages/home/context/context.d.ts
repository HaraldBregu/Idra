import { type Dispatch } from 'react';
import type { AgentChatAction } from './actions';
import type { AgentChatState } from './state';
export interface HomeAgentContextValue {
    readonly chatState: AgentChatState;
    readonly dispatchChat: Dispatch<AgentChatAction>;
}
export declare const HomeAgentContext: import("react").Context<HomeAgentContextValue | null>;
