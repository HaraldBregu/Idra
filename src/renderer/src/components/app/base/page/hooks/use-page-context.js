import { useContext } from 'react';
import { PageContext } from '../context/context';
export function usePageContext() {
    const ctx = useContext(PageContext);
    if (!ctx) {
        throw new Error('usePageContext must be used within a Provider');
    }
    return ctx;
}
