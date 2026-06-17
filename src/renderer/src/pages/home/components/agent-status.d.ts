import type { AgentMessage, AgentRunState } from '../context';
export declare function isRunningState(state: AgentRunState): boolean;
export declare function stateTone(state: AgentRunState): string;
export declare function agentStatusLabel(message: AgentMessage): string;
