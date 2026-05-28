import type { JSONSchema } from '../../provider/types';
import type { AgentTool as LegacyAgentTool, ToolContext } from '../core/types';
import type {
	AgentTool as RuntimeAgentTool,
	ToolDiagnostics,
} from '../core/common';
import { copyToolMetadata, toProviderSafeName } from '../core/common';
import { normalizeToolSchemas } from '../core/schema-normalization';
import { canonicalToolToLegacy, legacyToolToCanonical } from './legacy-bridge';

export type PrepareLegacyToolsForProviderOptions = {
	provider?: string;
	modelId?: string;
	diagnostics?: ToolDiagnostics;
	maxNameLength?: number;
};

export function prepareLegacyToolsForProvider(
	tools: LegacyAgentTool[],
	ctx: ToolContext,
	options: PrepareLegacyToolsForProviderOptions = {}
): LegacyAgentTool[] {
	const runtimeTools = tools.map((tool) => legacyToolToRuntimeTool(tool, ctx));
	const providerNamedTools = applyProviderSafeToolNames(runtimeTools, options);
	const normalizedTools = normalizeToolSchemas(providerNamedTools, {
		provider: options.provider,
		modelId: options.modelId,
		diagnostics: options.diagnostics,
	});
	return normalizedTools.map(runtimeToolToLegacyTool);
}

export function legacyToolToRuntimeTool(
	tool: LegacyAgentTool,
	ctx: ToolContext
): RuntimeAgentTool<JSONSchema> {
	return legacyToolToCanonical(tool, ctx) as RuntimeAgentTool<JSONSchema>;
}

export function runtimeToolToLegacyTool(tool: RuntimeAgentTool): LegacyAgentTool {
	return canonicalToolToLegacy(tool);
}

export function applyProviderSafeToolNames(
	tools: RuntimeAgentTool[],
	options: Pick<PrepareLegacyToolsForProviderOptions, 'diagnostics' | 'maxNameLength'> = {}
): RuntimeAgentTool[] {
	const maxNameLength = options.maxNameLength ?? 64;
	const usedNames = new Set<string>();

	return tools.map((tool) => {
		const safeName = uniqueProviderSafeName(tool.name, usedNames, maxNameLength);
		if (safeName === tool.name) return tool;

		const renamed: RuntimeAgentTool = {
			...tool,
			name: safeName,
			label: tool.label ?? tool.name,
			description: `Provider-safe alias for ${tool.name}. ${tool.description}`,
		};
		copyToolMetadata(tool, renamed);
		options.diagnostics?.warnings.push(
			`${tool.name}: exposed to provider as ${safeName}`
		);
		return renamed;
	});
}

function uniqueProviderSafeName(
	name: string,
	usedNames: Set<string>,
	maxNameLength: number
): string {
	const base = toProviderSafeName(name).slice(0, maxNameLength);
	let candidate = base;
	let suffix = 2;
	while (usedNames.has(candidate)) {
		const tag = `_${suffix++}`;
		candidate = `${base.slice(0, Math.max(1, maxNameLength - tag.length))}${tag}`;
	}
	usedNames.add(candidate);
	return candidate;
}
