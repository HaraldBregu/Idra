import type { AgentTool, AgentToolResult, ToolDiagnostics } from '../core/common';
import {
	getToolMetadata,
	sanitizeParamPreview,
	ToolInputError,
	type ToolContent,
} from '../core/common';
import { wrapToolWithBeforeToolCall, type BeforeToolCallContext } from '../wrap';
import { coerceJsonObject } from '../core/params';
import { errorToolResult } from '../core/results';

export type ModelToolDefinition = {
	name: string;
	label?: string;
	description: string;
	parameters: unknown;
	execute: (
		toolCallId: string,
		params: unknown,
		signal?: AbortSignal
	) => Promise<AgentToolResult>;
};

export type ToolDefinitionAdapterContext = BeforeToolCallContext & {
	diagnostics?: ToolDiagnostics;
};

export function toToolDefinitions(
	tools: AgentTool[],
	context: ToolDefinitionAdapterContext = {}
): ModelToolDefinition[] {
	const seen = new Set<string>();
	return tools.map((tool) => {
		if (seen.has(tool.name)) throw new Error(`duplicate tool definition: ${tool.name}`);
		seen.add(tool.name);
		const metadata = getToolMetadata(tool);
		const executable = metadata?.wrapped ? tool : wrapToolWithBeforeToolCall(tool, context);
		return {
			name: executable.name,
			label: executable.label,
			description: executable.description,
			parameters: executable.parameters,
			async execute(toolCallId, rawParams, signal) {
				let params: Record<string, unknown>;
				try {
					params = coerceJsonObject(rawParams);
				} catch (error) {
					if (error instanceof ToolInputError) return inputErrorResult(error);
					return errorToolResult({ toolName: executable.name, error });
				}
				context.diagnostics?.emit({
					type: 'tool.adapter.call',
					details: {
						toolName: executable.name,
						toolCallId,
						params: sanitizeParamPreview(params),
					},
				});
				if (metadata?.clientHosted) {
					return {
						content: [
							{
								type: 'text',
								text: `Tool execution delegated to client: ${executable.name}`,
							},
						],
						details: {
							status: 'pending',
							tool: executable.name,
							message: 'Tool execution delegated to client',
						},
						terminate: true,
					};
				}
				try {
					return normalizeToolReturn(await executable.execute(toolCallId, params, signal));
				} catch (error) {
					if (error instanceof ToolInputError) return inputErrorResult(error);
					return errorToolResult({ toolName: executable.name, error });
				}
			},
		};
	});
}

function inputErrorResult(error: ToolInputError): AgentToolResult {
	return {
		content: [{ type: 'text', text: error.message }],
		details: { status: 'input_error', message: error.message, details: error.details },
	};
}

function normalizeToolReturn(value: unknown): AgentToolResult {
	if (typeof value === 'object' && value !== null && Array.isArray((value as { content?: unknown }).content)) {
		const candidate = value as { content: ToolContent[]; details?: unknown; terminate?: boolean };
		return {
			content: candidate.content,
			details: candidate.details,
			terminate: candidate.terminate,
		};
	}
	return {
		content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }],
		details: value,
	};
}

