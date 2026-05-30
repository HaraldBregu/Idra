import type { JSONSchema } from '../../../provider/types';
import type { AgentTool, ToolDiagnostics } from './common';
import { copyToolMetadata } from './common';

export type ToolSchemaNormalizationContext = {
	provider?: string;
	modelId?: string;
	diagnostics?: ToolDiagnostics;
};

const UNSUPPORTED_BY_PROVIDER: Record<string, Set<string>> = {
	openai: new Set([
		'$schema',
		'$id',
		'unevaluatedProperties',
		'patternProperties',
		'dependencies',
		'dependentSchemas',
		'if',
		'then',
		'else',
	]),
	anthropic: new Set(['$schema', '$id', 'unevaluatedProperties']),
};

export function normalizeToolSchemas(
	tools: AgentTool[],
	context: ToolSchemaNormalizationContext = {}
): AgentTool[] {
	return tools.map((tool) => {
		const parameters = normalizeSchema(tool.parameters, context, tool.name) as JSONSchema;
		const normalized: AgentTool = { ...tool, parameters };
		copyToolMetadata(tool, normalized);
		return normalized;
	});
}

function normalizeSchema(schema: unknown, context: ToolSchemaNormalizationContext, toolName: string): unknown {
	const clone = deepClone(schema);
	const provider = context.provider?.toLowerCase() ?? '';
	const unsupported = UNSUPPORTED_BY_PROVIDER[provider] ?? new Set<string>();
	const rewritten = removeUnsupported(clone, unsupported);
	const root = rewritten as Record<string, unknown>;
	if ((Array.isArray(root.anyOf) || Array.isArray(root.oneOf)) && !root.type) {
		context.diagnostics?.warnings.push(`${toolName}: root schema union flattened for provider ${provider || 'default'}`);
		return {
			type: 'object',
			properties: {},
			additionalProperties: true,
			description: typeof root.description === 'string' ? root.description : 'Provider-safe object parameters.',
		};
	}
	if (root.type === 'object') {
		if (!root.properties) root.properties = {};
		if (!Array.isArray(root.required)) root.required = [];
	}
	return rewritten;
}

function removeUnsupported(value: unknown, unsupported: Set<string>): unknown {
	if (Array.isArray(value)) return value.map((entry) => removeUnsupported(entry, unsupported));
	if (typeof value !== 'object' || value === null) return value;
	const output = value as Record<string, unknown>;
	for (const key of Object.keys(output)) {
		if (unsupported.has(key)) {
			delete output[key];
		} else {
			output[key] = removeUnsupported(output[key], unsupported);
		}
	}
	return output;
}

function deepClone(value: unknown): unknown {
	if (value === undefined) return {};
	return JSON.parse(JSON.stringify(value));
}

