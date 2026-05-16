import { useReducer, type ReactElement, type ReactNode } from 'react';
import { assistantChatReducer } from './reducer';
import { initialAssistantChatState } from './state';
import { HomeAssistantContext } from './context';

export function Provider({
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
