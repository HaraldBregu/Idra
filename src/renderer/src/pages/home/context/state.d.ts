import type { AgentRunState } from '@/lib/compat';
import type { AgentToolPart } from './tool-parts';
export type { AgentRunState, AgentToolPart };
export interface UserMessage {
    readonly id: string;
    readonly role: 'user';
    readonly type: 'user';
    readonly content: string;
}
export interface AgentMessage {
    readonly id: string;
    readonly role: 'agent';
    readonly type: 'agent';
    readonly content: string;
    readonly runId?: string;
    readonly state: AgentRunState;
    readonly tools: readonly AgentToolPart[];
    readonly errorText?: string;
    readonly startedAtMs?: number;
    readonly completedAtMs?: number;
}
export type HomeChatMessage = UserMessage | AgentMessage;
export interface AgentChatState {
    readonly messages: readonly HomeChatMessage[];
    readonly activeAgentId?: string;
    readonly activeRunId?: string;
}
export declare const welcomeMessage: AgentMessage;
export declare const initialAgentChatState: AgentChatState;
