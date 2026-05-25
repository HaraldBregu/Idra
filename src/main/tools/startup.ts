import type { AgentTool } from './core/types';

export const startupFilesTool: AgentTool = {
	name: 'startup_files',
	description: 'Reads workspace startup files to bootstrap the agent context.',
	schema: { type: 'object', properties: {}, additionalProperties: false },
	async execute(_args, _ctx) {
		return { status: 'ok', content: [{ type: 'text', text: '' }] };
	},
};
