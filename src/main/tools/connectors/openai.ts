import type { AgentTool } from '../core/tool';
import { textResult } from '../core/tool';
import { jsonText } from '../shared/json-text';

export const openAiConnectorToolsTool: AgentTool = {
	name: 'openai_connector_tools',
	description: 'List configured OpenAI Responses API MCP connector tool specs.',
	schema: {
		type: 'object',
		properties: {},
		additionalProperties: false,
	},
	async execute(_args, ctx) {
		const connectorTools = ctx.services.connectorTools;
		if (!connectorTools) {
			return textResult(
				'openai_connector_tools: connector tools service is not configured.',
				true
			);
		}
		return jsonText(connectorTools.createOpenAIConnectorTools());
	},
};
