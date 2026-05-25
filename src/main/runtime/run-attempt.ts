import type { AgentTool } from '../tools/common';
import { createAgentTools, type CreateAgentToolsOptions, type CreateAgentToolsResult } from '../tools/create';
import { toToolDefinitions, type ModelToolDefinition } from '../tools/definitions';

export type RunAttemptToolAssembly = CreateAgentToolsResult & {
	definitions: ModelToolDefinition[];
	validToolNames: Set<string>;
};

export async function createRunAttemptTools(
	options: CreateAgentToolsOptions
): Promise<RunAttemptToolAssembly> {
	const assembled = await createAgentTools(options);
	const definitions = toToolDefinitions(assembled.tools, {
		diagnostics: assembled.diagnostics,
		signal: options.abortSignal,
	});
	return {
		...assembled,
		definitions,
		validToolNames: new Set(assembled.tools.map((tool: AgentTool) => tool.name)),
	};
}

