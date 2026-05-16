import { useContext } from 'react';
import { HomeAgentContext, type HomeAgentContextValue } from './context';

export function useHomeAgentContext(): HomeAgentContextValue {
	const context = useContext(HomeAgentContext);
	if (!context) {
		throw new Error('useHomeAgentContext must be used inside Provider');
	}
	return context;
}
