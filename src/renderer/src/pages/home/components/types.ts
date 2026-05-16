import type { RefObject } from 'react';

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
