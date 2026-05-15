import { createContext, useContext } from 'react';

export type ChatMode = 'chat' | 'voice';

interface ChatModeContextValue {
	mode: ChatMode;
	setMode: (mode: ChatMode) => void;
}

export const ChatModeContext = createContext<ChatModeContextValue>({
	mode: 'chat',
	setMode: () => {},
});

export function useChatMode(): ChatModeContextValue {
	return useContext(ChatModeContext);
}
