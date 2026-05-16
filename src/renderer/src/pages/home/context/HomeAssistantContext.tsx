import {
	createContext,
	useContext,
	useReducer,
	type Dispatch,
	type ReactElement,
	type ReactNode,
} from 'react';
import type { AssistantChatAction } from './actions';
import { assistantChatReducer } from './reducer';
import { initialAssistantChatState, type AssistantChatState } from './state';

interface HomeAssistantContextValue {
	readonly chatState: AssistantChatState;
	readonly dispatchChat: Dispatch<AssistantChatAction>;
}

const HomeAssistantContext = createContext<HomeAssistantContextValue | null>(null);

export function HomeAssistantProvider({
	children,
}: {
	readonly children: ReactNode;
}): ReactElement {
	const [chatState, dispatchChat] = useReducer(
		assistantChatReducer,
		initialAssistantChatState
	);

	return (
		<HomeAssistantContext.Provider value={{ chatState, dispatchChat }}>
			{children}
		</HomeAssistantContext.Provider>
	);
}

export function useHomeAssistantContext(): HomeAssistantContextValue {
	const context = useContext(HomeAssistantContext);
	if (!context) {
		throw new Error('useHomeAssistantContext must be used inside HomeAssistantProvider');
	}
	return context;
}
