export type {
	AgentToolManagementOptions,
	AgentToolSelectionForTurn,
} from './service';
export { ToolService as ToolExecutor } from './service';
export function selectAgentToolsForTurn<T>(tools: T[]): { toolsForPrompt: T[]; rankedTools: T[]; systemPromptSuffix: string } {
	return { toolsForPrompt: tools, rankedTools: tools, systemPromptSuffix: '' };
}
