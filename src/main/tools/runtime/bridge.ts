import type {
	AgentTool as CanonicalAgentTool,
	AgentToolResult as CanonicalAgentToolResult,
	ToolContent,
} from '../core/common';
import type {
	AgentTool as LegacyAgentTool,
	AgentToolResult as LegacyAgentToolResult,
	ToolContext,
} from '../core/types';
import type { ToolResultBlock } from '../../provider/types';

type CanonicalToolWithLegacyApproval = CanonicalAgentTool & {
	needsApproval?: LegacyAgentTool['needsApproval'];
};

export function legacyToolToCanonical(
	tool: LegacyAgentTool,
	toolContext: ToolContext
): CanonicalAgentTool {
	const canonical: CanonicalToolWithLegacyApproval = {
		name: tool.name,
		description: tool.description,
		displaySummary: tool.displaySummary,
		parameters: tool.schema,
		ownerOnly: tool.ownerOnly,
		needsApproval: tool.needsApproval,
		async execute(_toolCallId, params, signal) {
			const result = await tool.execute(params as Record<string, unknown>, {
				...toolContext,
				signal: signal ?? toolContext.signal,
			});
			return legacyResultToCanonical(result);
		},
	};
	return canonical;
}

export function canonicalToolToLegacy(tool: CanonicalAgentTool): LegacyAgentTool {
	const source = tool as CanonicalToolWithLegacyApproval;
	return {
		name: tool.name,
		displaySummary: tool.displaySummary,
		description: tool.description,
		schema: tool.parameters as LegacyAgentTool['schema'],
		ownerOnly: tool.ownerOnly,
		needsApproval: source.needsApproval,
		async execute(args, ctx) {
			const result = await tool.execute(tool.name, args, ctx.signal);
			return canonicalResultToLegacy(result);
		},
	};
}

export function legacyResultToCanonical(
	result: LegacyAgentToolResult
): CanonicalAgentToolResult {
	return {
		content: legacyContentToCanonical(result.content),
		details:
			result.status !== 'ok'
				? detailsWithStatus(result.status, result.details)
				: result.details,
	};
}

export function canonicalResultToLegacy(
	result: CanonicalAgentToolResult
): LegacyAgentToolResult {
	return {
		status: legacyStatusFromDetails(result.details),
		content: canonicalContentToLegacy(result.content),
		details: result.details,
	};
}

function legacyContentToCanonical(content: ToolResultBlock[]): ToolContent[] {
	return content.map((block) => {
		if (block.type === 'text') return { type: 'text', text: block.text };
		return {
			type: 'image',
			data: block.base64 ?? '',
			mimeType: block.mimeType ?? 'image/png',
		};
	});
}

function canonicalContentToLegacy(content: ToolContent[]): ToolResultBlock[] {
	return content.map((block) => {
		if (block.type === 'text') return { type: 'text', text: block.text };
		return {
			type: 'image',
			base64: block.data,
			mimeType: block.mimeType,
		};
	});
}

function detailsWithStatus(status: 'error' | 'blocked', details: unknown): unknown {
	if (details && typeof details === 'object' && !Array.isArray(details)) {
		return { ...(details as Record<string, unknown>), status };
	}
	return { status, details };
}

function legacyStatusFromDetails(details: unknown): LegacyAgentToolResult['status'] {
	if (!details || typeof details !== 'object') return 'ok';
	const status = (details as { status?: unknown }).status;
	if (status === 'blocked') return 'blocked';
	return status === 'error' || status === 'blocked' || status === 'input_error' ? 'error' : 'ok';
}
