import React, { type ReactNode } from 'react';
import { type PageState } from './context/state';
interface ProviderProps {
    readonly children: ReactNode;
    readonly initialState?: Partial<PageState>;
}
export declare const Provider: React.NamedExoticComponent<ProviderProps>;
export {};
