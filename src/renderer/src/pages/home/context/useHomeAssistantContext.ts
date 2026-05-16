import { useContext } from 'react';
import { HomeAssistantContext, type HomeAssistantContextValue } from './context';

export function useHomeAssistantContext(): HomeAssistantContextValue {
	const context = useContext(HomeAssistantContext);
	if (!context) {
		throw new Error('useHomeAssistantContext must be used inside Provider');
	}
	return context;
}
