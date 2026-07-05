import type { Tool } from '../types';

export interface SubagentDefinition {
	name: string;
	description: string;
	instructions: string;
	tools: Tool[];
	maxIterations?: number;
}
