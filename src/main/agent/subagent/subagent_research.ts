import { readTool } from '../tools/file_read';
import { webFetchTool } from '../tools/web_fetch';
import { webSearchTool } from '../tools/web_search';
import { subagentTool } from './subagent_tool';

export const researchTool = subagentTool({
	name: 'research',
	description:
		'Delegate a research task to a subagent that explores files and the web in its own context and returns only a focused summary. Use for research that needs many file reads or web lookups.',
	instructions: `You are a research agent. Complete the task autonomously.

IMPORTANT: When you have finished, write a clear summary of your findings as your final response.
This summary will be returned to the main agent, so include all relevant information.`,
	tools: [readTool, webSearchTool, webFetchTool],
});
