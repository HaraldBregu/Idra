import { shell } from 'electron';
import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';

interface OpenBrowserArgs {
	url: string;
}

export const openBrowserTool: AgentTool<OpenBrowserArgs> = {
	name: 'open_browser',
	description: "Open a URL in the user's default browser.",
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
