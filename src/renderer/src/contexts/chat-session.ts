import { createContext, useContext } from 'react';

export const DEFAULT_CHAT_SESSION_ID = 'home';

interface ChatSessionContextValue {
	sessionId: string;
	setSessionId: (sessionId: string) => void;
}

export const ChatSessionContext = createContext<ChatSessionContextValue>({
	sessionId: DEFAULT_CHAT_SESSION_ID,
	setSessionId: () => {},
});

export function useChatSession(): ChatSessionContextValue {
	return useContext(ChatSessionContext);
}
