import React, { type ReactNode } from 'react';
export type AppLanguage = 'en' | 'it';
export type SidebarState = 'expanded' | 'collapsed';
export interface AppContextValue {
    language: AppLanguage;
    setLanguage: (language: AppLanguage) => void;
    resetState: () => void;
}
interface AppProviderProps {
    children: ReactNode;
    initialState?: {
        language?: AppLanguage;
    };
}
export declare function AppProvider({ children, initialState }: AppProviderProps): React.JSX.Element;
export declare function useApp(): AppContextValue;
export {};
