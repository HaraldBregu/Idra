import type { RuntimeTool } from '../../runtime';

const DEFAULT_TOOLS: RuntimeTool[] = [
	{
		name: 'read',
		description: 'Read a UTF-8 file from the workspace.',
	},
	{
		name: 'find',
		description: 'Find files by glob pattern in the workspace.',
	},
	{
		name: 'edit',
		description: 'Apply targeted text replacements to existing files.',
	},
	{
		name: 'write',
		description: 'Create or write a UTF-8 file in the workspace.',
	},
	{
		name: 'exec',
		description: 'Run a shell command in the workspace.',
	},
];

export class AgentTools {
	constructor(private readonly tools: RuntimeTool[] = DEFAULT_TOOLS) {}

	getTools(): RuntimeTool[] {
		return [...this.tools];
	}
}
