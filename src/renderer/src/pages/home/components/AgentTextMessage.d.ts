import { type ReactElement } from 'react';
import { type AgentMessage } from '../context';
export declare function AgentTextMessage({ message, isStreaming, showHeader, collapseLongContent, className, }: {
    readonly message: AgentMessage;
    readonly isStreaming?: boolean;
    readonly showHeader?: boolean;
    readonly collapseLongContent?: boolean;
    readonly className?: string;
}): ReactElement;
