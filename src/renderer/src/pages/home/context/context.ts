import { createContext, type Dispatch } from 'react';
import type { AssistantChatAction } from './actions';
import type { AssistantChatState } from './state';

export interface HomeAssistantContextValue {
	readonly chatState: AssistantChatState;
	readonly dispatchChat: Dispatch<AssistantChatAction>;
}

export const HomeAssistantContext = createContext<HomeAssistantContextValue | null>(null);
