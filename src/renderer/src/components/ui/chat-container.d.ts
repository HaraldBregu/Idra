import * as React from 'react';
export type ChatContainerRootProps = {
    children: React.ReactNode;
    className?: string;
} & React.HTMLAttributes<HTMLDivElement>;
declare function ChatContainerRoot({ children, className, ...props }: ChatContainerRootProps): import("react/jsx-runtime").JSX.Element;
export type ChatContainerContentProps = {
    children: React.ReactNode;
    className?: string;
} & React.HTMLAttributes<HTMLDivElement>;
declare function ChatContainerContent({ children, className, ...props }: ChatContainerContentProps): import("react/jsx-runtime").JSX.Element;
export type ChatContainerScrollAnchorProps = {
    className?: string;
    ref?: React.RefObject<HTMLDivElement>;
};
declare function ChatContainerScrollAnchor({ className, ref }: ChatContainerScrollAnchorProps): import("react/jsx-runtime").JSX.Element;
export { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor };
