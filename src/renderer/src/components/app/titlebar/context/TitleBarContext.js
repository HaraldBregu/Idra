import { createContext, useContext } from 'react';
const TitleBarContext = createContext({
    isMac: false,
    isFullScreen: false,
});
export const useTitleBarContext = () => useContext(TitleBarContext);
export const TitleBarProvider = TitleBarContext.Provider;
