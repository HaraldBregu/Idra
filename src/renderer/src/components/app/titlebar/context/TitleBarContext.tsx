import { createContext, useContext } from 'react';

interface TitleBarContextValue {
	isMac: boolean;
	isFullScreen: boolean;
	isMaximized: boolean;
}

const TitleBarContext = createContext<TitleBarContextValue>({
	isMac: false,
	isFullScreen: false,
	isMaximized: false,
});

export const useTitleBarContext = () => useContext(TitleBarContext);
export const TitleBarProvider = TitleBarContext.Provider;
