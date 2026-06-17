import type { ToolPart } from '@/components/prompt-kit/tool';
import type { AgentHistoryContentBlock, AgentResponseEvent, AgentToolCallStatus } from '@/lib/compat';
export type AgentToolPart = ToolPart & {
    toolCallId: string;
    status?: AgentToolCallStatus;
};
type AgentToolPartPatch = Omit<Partial<AgentToolPart>, 'toolCallId'>;
export declare function updateAgentToolPart(tools: readonly AgentToolPart[], toolCallId: string, patch: AgentToolPartPatch): AgentToolPart[];
export declare function applyAgentResponseEventToTools(tools: readonly AgentToolPart[], event: AgentResponseEvent): AgentToolPart[] | undefined;
export declare function agentToolPartFromHistoryBlock(block: AgentHistoryContentBlock): AgentToolPart | undefined;
export {};
