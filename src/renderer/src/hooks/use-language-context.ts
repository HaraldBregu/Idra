import { useContext } from 'react';
import { LanguageContext } from '../contexts/AppContext';
import type { LanguageContextValue } from '../contexts/AppContext';

export function useLanguageContext(): LanguageContextValue {
	const ctx = useContext(LanguageContext);
	if (ctx === undefined) throw new Error('useLanguageContext must be used within an AppProvider');
	return ctx;
}
