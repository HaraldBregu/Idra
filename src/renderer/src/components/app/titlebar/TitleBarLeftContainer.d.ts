import React, { type ReactNode } from 'react';
interface TitleBarLeftContainerProps {
    readonly isMac: boolean;
    readonly isFullScreen?: boolean;
    readonly className?: string;
    readonly children: ReactNode;
}
export declare const TitleBarLeftContainer: React.NamedExoticComponent<TitleBarLeftContainerProps>;
export {};
