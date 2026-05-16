import type { RefObject } from 'react';
import type { HomeChatMessage, HomeMultiSelectMessage } from '../context';

export interface HomeChatSurfaceProps {
	readonly messages: readonly HomeChatMessage[];
	readonly activeAssistantId?: string;
	readonly selectedOptions: Record<string, readonly string[]>;
	readonly pendingInputAnswers: Record<string, string>;
	readonly input: string;
	readonly isLoading: boolean;
	readonly historyLoading: boolean;
	readonly inputRef: RefObject<HTMLTextAreaElement | null>;
	readonly onInputChange: (value: string) => void;
	readonly onSubmit: () => void;
	readonly onReset: () => void;
	readonly onSelectApprovalOption: (
		messageId: string,
		approvalId: string,
		optionId: string
	) => void;
	readonly onPendingInputChange: (
		messageId: string,
		inputId: string,
		value: string
	) => void;
	readonly onSubmitPending: (message: HomeMultiSelectMessage) => void;
	readonly onUseSuggestion: (prompt: string) => void;
	readonly onVoiceModeRequest: () => void;
}

export interface ComposerProps {
	readonly value: string;
	readonly isLoading: boolean;
	readonly canReset: boolean;
	readonly inputRef: RefObject<HTMLTextAreaElement | null>;
	readonly onValueChange: (value: string) => void;
	readonly onSubmit: () => void;
	readonly onReset: () => void;
	readonly onVoiceModeRequest: () => void;
}
