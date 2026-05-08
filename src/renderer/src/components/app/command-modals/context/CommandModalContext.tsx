import { createContext, useContext } from 'react';

export type CommandModalId = 'documents';

export interface CommandModalContextValue {
	activeModal: CommandModalId | null;
	open: (modal: CommandModalId) => void;
	close: () => void;
	toggle: (modal: CommandModalId) => void;
}

export const CommandModalContext = createContext<CommandModalContextValue | null>(null);

export function useCommandModal(): CommandModalContextValue {
	const context = useContext(CommandModalContext);
	if (!context) {
		throw new Error('useCommandModal must be used inside <CommandModalProvider>');
	}
	return context;
}
