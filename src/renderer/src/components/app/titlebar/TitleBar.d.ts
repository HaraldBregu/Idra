import React, { type ReactNode } from 'react';
export interface TitleBarProps {
    /** Optional class applied to the title bar container */
    className?: string;
    /** Optional inline style applied to the title bar container */
    style?: React.CSSProperties;
    /** Text displayed centered in the title bar */
    title?: string;
    /** Custom content rendered in the center, replaces the title */
    centerContent?: ReactNode;
    /** Custom content rendered on the right before window controls */
    rightContent?: ReactNode;
    /** Called when the sidebar toggle button is clicked */
    onToggleSidebar?: () => void;
    /** When true, renders agentic + info sidebar toggle buttons on the right */
    showSidebarToggles?: boolean;
}
export declare const TitleBar: React.NamedExoticComponent<TitleBarProps>;
