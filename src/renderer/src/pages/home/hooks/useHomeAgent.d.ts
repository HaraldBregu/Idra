import type { ChatMode } from '@/contexts/chat-mode';
import type { ModelReasoningEffort } from '@/lib/compat';
export declare function resolvePromptReasoningEffort(prompt: string): {
    effort: ModelReasoningEffort;
    lightContext: boolean;
};
export declare function useHomeAgent({ setMode }: {
    readonly setMode: (mode: ChatMode) => void;
}): {
    chatState: import("../context").AgentChatState;
    handleSubmit: () => void;
    historyLoading: boolean;
    input: string;
    inputRef: import("react").RefObject<HTMLTextAreaElement | null>;
    isLoading: boolean;
    resetChat: () => void;
    setInput: import("react").Dispatch<import("react").SetStateAction<string>>;
    switchToTyping: () => void;
    useSuggestion: (prompt: string) => void;
};
