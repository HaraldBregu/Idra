import { useContext } from 'react';
import { HomeAgentContext } from './context';
export function useHomeAgentContext() {
    const context = useContext(HomeAgentContext);
    if (!context) {
        throw new Error('useHomeAgentContext must be used inside Provider');
    }
    return context;
}
