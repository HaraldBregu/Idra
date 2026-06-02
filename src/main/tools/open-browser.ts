import { shell } from 'electron';
import type { AgentTool } from './base/tool';
import { textResult } from './base/tool';
import { toolDescription } from './base/metadata';

export const openBrowserTool: AgentTool<{ url: string }> = {
	name: 'open_browser',
	description: toolDescription('open_browser'),
	schema: {
		type: 'object',
		properties: { url: { type: 'string', description: 'The http or https URL to open.' } },
		required: ['url'],
		additionalProperties: false,
	},
	async execute(args) {
		const url = String(args.url ?? '').trim();
		if (!/^https?:\/\//i.test(url)) {
			return textResult('open_browser: only http and https URLs are supported', true);
		}
		await shell.openExternal(url);
		return textResult(`Opened ${url}`);
	},
};
