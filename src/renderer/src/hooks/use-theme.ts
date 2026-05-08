import { useContext } from 'react';
import { ThemeContext } from '../contexts/AppContext';
import type { ThemeContextValue } from '../contexts/AppContext';

export function useTheme(): ThemeContextValue {
	const ctx = useContext(ThemeContext);
	if (ctx === undefined) throw new Error('useTheme must be used within an AppProvider');
	return ctx;
}
