import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { AppStartupInfo } from '../../shared/types';

interface StartupRouterContextValue {
	readonly startupInfo: AppStartupInfo;
	readonly showSplash: boolean;
	readonly setStartupInfo: Dispatch<SetStateAction<AppStartupInfo | null>>;
}

const StartupRouterContext = createContext<StartupRouterContextValue | null>(null);

interface StartupRouterProviderProps {
	readonly value: StartupRouterContextValue;
	readonly children: ReactNode;
}

export function StartupRouterProvider({ value, children }: StartupRouterProviderProps) {
	return <StartupRouterContext.Provider value={value}>{children}</StartupRouterContext.Provider>;
}

export function useStartupRouterContext(): StartupRouterContextValue {
	const context = useContext(StartupRouterContext);

	if (!context) {
		throw new Error('useStartupRouterContext must be used within StartupRouterProvider');
	}

	return context;
}
