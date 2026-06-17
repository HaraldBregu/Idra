import type { AgentToolPart } from './tool-parts';
export interface AgentSkillUsage {
    readonly id: string;
    readonly version?: string;
    readonly label: string;
}
export declare function getAgentSkillUsages(tools: readonly AgentToolPart[]): AgentSkillUsage[];
