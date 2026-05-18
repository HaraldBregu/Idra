import type { AgentTool } from './common';
import { copyToolMetadata, getToolMetadata, normalizeToolName, setToolMetadata } from './common';
import { asParamsRecord, readNumberParam, readStringParam } from './params';
import { jsonResult } from './results';
import { TOOL_LIMITS } from './limits';

export type ToolSearchCompactionOptions = {
	enabled?: boolean;
	threshold?: number;
	visibleTools?: string[];
};

export type ToolSearchCompactionResult = {
	tools: AgentTool[];
	catalogedTools: AgentTool[];
	visibleTools: AgentTool[];
};

export function applyToolSearchCompaction(
	tools: AgentTool[],
	options: ToolSearchCompactionOptions = {}
): ToolSearchCompactionResult {
	const threshold = options.threshold ?? TOOL_LIMITS.toolSearch.compactionThreshold;
	if (options.enabled === false || tools.length <= threshold) {
		return { tools, catalogedTools: [], visibleTools: tools };
	}
	const visibleNames = new Set((options.visibleTools ?? []).map(normalizeToolName));
	const visibleTools = tools.filter((tool) => visibleNames.has(normalizeToolName(tool.name)));
	const catalogedTools = tools.filter((tool) => !visibleNames.has(normalizeToolName(tool.name)));
	const controls = createToolSearchControls(catalogedTools);
	return { tools: [...visibleTools, ...controls], catalogedTools, visibleTools };
}

export function createToolSearchControls(catalogedTools: AgentTool[]): AgentTool[] {
	const catalog = new Map(catalogedTools.map((tool) => [normalizeToolName(tool.name), tool]));

	const toolSearch: AgentTool = {
		name: 'tool_search',
		description: 'Search the hidden tool catalog by keyword and return matching tool names.',
		parameters: {
			type: 'object',
			properties: {
				query: { type: 'string' },
				limit: { type: 'number' },
			},
			required: ['query'],
			additionalProperties: false,
		},
		async execute(_toolCallId, params) {
			const record = asParamsRecord(params);
			const query = readStringParam(record, 'query', {
				required: true,
				minLength: 1,
			})!.toLowerCase();
			const limit = readNumberParam(record, 'limit', {
				defaultValue: TOOL_LIMITS.toolSearch.defaultLimit,
				min: 1,
				max: TOOL_LIMITS.toolSearch.maxLimit,
				integer: true,
			})!;
			const terms = query.split(/\s+/).filter(Boolean);
			const matches = catalogedTools
				.map((tool) => ({ tool, score: scoreTool(tool, terms) }))
				.filter((entry) => entry.score > 0)
				.sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
				.slice(0, limit)
				.map((entry) => ({
					name: entry.tool.name,
					label: entry.tool.label,
					description: entry.tool.description,
				}));
			return jsonResult({ matches });
		},
	};

	const toolDescribe: AgentTool = {
		name: 'tool_describe',
		description: 'Return the full schema and metadata for a hidden catalog tool.',
		parameters: {
			type: 'object',
			properties: { name: { type: 'string' } },
			required: ['name'],
			additionalProperties: false,
		},
		async execute(_toolCallId, params) {
			const name = readStringParam(asParamsRecord(params), 'name', { required: true })!;
			const tool = catalog.get(normalizeToolName(name));
			if (!tool) return jsonResult({ error: `Unknown catalog tool: ${name}` });
			return jsonResult({
				name: tool.name,
				label: tool.label,
				description: tool.description,
				parameters: tool.parameters,
				metadata: getToolMetadata(tool),
			});
		},
	};

	const toolCall: AgentTool = {
		name: 'tool_call',
		description: 'Execute a hidden catalog tool by name through the same wrapped execution path.',
		parameters: {
			type: 'object',
			properties: {
				name: { type: 'string' },
				args: { type: 'object', additionalProperties: true },
			},
			required: ['name', 'args'],
			additionalProperties: false,
		},
		async execute(toolCallId, params, signal, onUpdate) {
			const record = asParamsRecord(params);
			const name = readStringParam(record, 'name', { required: true })!;
			const tool = catalog.get(normalizeToolName(name));
			if (!tool) return jsonResult({ error: `Unknown catalog tool: ${name}` });
			return tool.execute(`${toolCallId}:${tool.name}`, record.args ?? {}, signal, onUpdate);
		},
	};

	return [toolSearch, toolDescribe, toolCall].map((tool) => {
		setToolMetadata(tool, { ownerKind: 'core' });
		return tool;
	});
}

function scoreTool(tool: AgentTool, terms: string[]): number {
	const metadata = getToolMetadata(tool);
	const haystack = [
		tool.name,
		tool.label,
		tool.description,
		metadata?.ownerKind,
		metadata?.pluginId,
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
	return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export function cloneToolForCatalog(tool: AgentTool): AgentTool {
	const cloned = { ...tool };
	copyToolMetadata(tool, cloned);
	return cloned;
}
