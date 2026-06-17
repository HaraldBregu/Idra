import { createContext, useContext } from 'react';
export const ChatModeContext = createContext({
    mode: 'chat',
    setMode: () => { },
});
export function useChatMode() {
    return useContext(ChatModeContext);
}
