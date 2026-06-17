import type { ReactElement } from 'react';
import type { AgentToolPart } from '../context';
export declare function AgentToolActivity({ tools, className, }: {
    readonly tools: readonly AgentToolPart[];
    readonly className?: string;
}): ReactElement | null;
