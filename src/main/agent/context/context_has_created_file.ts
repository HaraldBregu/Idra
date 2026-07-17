import type { AgentContext } from './context_types';

export function hasCreatedFile(context: AgentContext | undefined, filePath: string): boolean {
	return context?.tools?.some((state) => state.toolName === 'write' && state.path === filePath) ?? false;
}
