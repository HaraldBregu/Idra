import type { ReactElement } from 'react';
import type { AgentMessage } from '../context';
export declare function AgentActivityPanel({ message, isStreaming, }: {
    readonly message: AgentMessage;
    readonly isStreaming: boolean;
}): ReactElement | null;
