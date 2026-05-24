import type { JSONSchema, ToolResultBlock } from '../../provider/types';
import type {
	AgentTool as LegacyAgentTool,
	AgentToolResult as LegacyAgentToolResult,
	ToolContext,
} from '../core/types';
import type {
	AgentTool as RuntimeAgentTool,
	AgentToolResult as RuntimeAgentToolResult,
	ToolContent,
	ToolDiagnostics,
} from '../core/common';
import {
	copyToolMetadata,
	getToolMetadata,
	setToolMetadata,
	toProviderSafeName,
} from '../core/common';
import { normalizeToolSchemas } from '../core/schema-normalization';

type LegacyStatusDetails = {
	legacyStatus: LegacyAgentToolResult['status'];
	details?: unknown;
};

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
	const runtimeTool: RuntimeAgentTool<JSONSchema> = {
		name: tool.name,
		label: tool.name,
		description: tool.description,
		parameters: tool.schema,
		ownerOnly: tool.ownerOnly,
		displaySummary: tool.displaySummary,
		async execute(_toolCallId, params, signal) {
			const result = await tool.execute(params as never, {
				...ctx,
				signal: signal ?? ctx.signal,
			});
			return legacyResultToRuntimeResult(result);
		},
	};
	const metadata = getToolMetadata(tool as unknown as RuntimeAgentTool);
	if (metadata) setToolMetadata(runtimeTool, { ...metadata });
	return runtimeTool;
}

export function runtimeToolToLegacyTool(tool: RuntimeAgentTool): LegacyAgentTool {
	const legacyTool: LegacyAgentTool = {
		name: tool.name,
		displaySummary: tool.displaySummary,
		description: tool.description,
		schema: tool.parameters as JSONSchema,
		ownerOnly: tool.ownerOnly,
		async execute(args, ctx) {
			const result = await tool.execute(`${ctx.sessionId}:${tool.name}`, args, ctx.signal);
			return runtimeResultToLegacyResult(result);
		},
	};
	copyToolMetadata(tool, legacyTool as unknown as RuntimeAgentTool);
	return legacyTool;
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

function legacyResultToRuntimeResult(
	result: LegacyAgentToolResult
): RuntimeAgentToolResult<LegacyStatusDetails> {
	return {
		content: result.content.map(legacyBlockToRuntimeBlock),
		details: {
			legacyStatus: result.status,
			details: result.details,
		},
	};
}

function runtimeResultToLegacyResult(result: RuntimeAgentToolResult): LegacyAgentToolResult {
	const legacyDetails = parseLegacyStatusDetails(result.details);
	return {
		status: legacyDetails?.legacyStatus ?? inferLegacyStatus(result.details),
		content: result.content.map(runtimeBlockToLegacyBlock),
		details: legacyDetails ? legacyDetails.details : result.details,
	};
}

function legacyBlockToRuntimeBlock(block: ToolResultBlock): ToolContent {
	if (block.type === 'image') {
		return {
			type: 'image',
			mimeType: block.mimeType ?? 'image/png',
			data: block.base64 ?? '',
		};
	}
	return { type: 'text', text: block.text };
}

function runtimeBlockToLegacyBlock(block: ToolContent): ToolResultBlock {
	if (block.type === 'image') {
		return {
			type: 'image',
			mimeType: block.mimeType,
			base64: block.data,
		};
	}
	return { type: 'text', text: block.text };
}

function parseLegacyStatusDetails(value: unknown): LegacyStatusDetails | undefined {
	if (typeof value !== 'object' || value === null) return undefined;
	const status = (value as { legacyStatus?: unknown }).legacyStatus;
	if (status !== 'ok' && status !== 'error') return undefined;
	return {
		legacyStatus: status,
		details: (value as { details?: unknown }).details,
	};
}

function inferLegacyStatus(details: unknown): LegacyAgentToolResult['status'] {
	if (typeof details !== 'object' || details === null) return 'ok';
	const status = (details as { status?: unknown }).status;
	return status === 'error' || status === 'blocked' || status === 'input_error'
		? 'error'
		: 'ok';
}
