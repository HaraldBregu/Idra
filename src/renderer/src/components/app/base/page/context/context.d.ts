import { type Dispatch } from 'react';
import type { PageState } from './state';
import type { PageAction } from './actions';
export interface ContextValue {
    state: PageState;
    dispatch: Dispatch<PageAction>;
    isMobile: boolean;
    toggleSidebar: () => void;
}
export declare const PageContext: import("react").Context<ContextValue | null>;
