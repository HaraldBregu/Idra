export type ChatMode = 'chat' | 'voice';
interface ChatModeContextValue {
    mode: ChatMode;
    setMode: (mode: ChatMode) => void;
}
export declare const ChatModeContext: import("react").Context<ChatModeContextValue>;
export declare function useChatMode(): ChatModeContextValue;
export {};
