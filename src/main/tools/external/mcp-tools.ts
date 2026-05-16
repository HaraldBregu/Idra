import type { AgentTool, ToolDiagnostics } from '../common';
import { markMcpTool, toProviderSafeName, ToolAuthorizationError } from '../common';
import { jsonResult, payloadTextResult } from '../results';

export type McpToolDescriptor = {
	serverId: string;
	name: string;
	description: string;
	parameters: unknown;
};

export type McpRuntime = {
	listTools: (context: McpToolRuntimeContext) => Promise<McpToolDescriptor[]>;
	callTool: (
		serverId: string,
		toolName: string,
		params: unknown,
		signal?: AbortSignal
	) => Promise<unknown>;
};

export type McpToolRuntimeContext = {
	sessionId?: string;
	runId?: string;
	workspaceDir?: string;
};

export type MaterializeMcpToolsOptions = {
	runtime?: McpRuntime;
	context: McpToolRuntimeContext;
	existingToolNames?: Set<string>;
	diagnostics?: ToolDiagnostics;
};

export function safeMcpToolName(
	serverId: string,
	toolName: string,
	usedNames: Set<string> = new Set()
): string {
	const base = toProviderSafeName(`mcp_${serverId}_${toolName}`).slice(0, 64);
	let candidate = base;
	let suffix = 2;
	while (usedNames.has(candidate)) {
		candidate = `${base.slice(0, 58)}_${suffix++}`;
	}
	usedNames.add(candidate);
	return candidate;
}

export async function materializeMcpTools(options: MaterializeMcpToolsOptions): Promise<AgentTool[]> {
	if (!options.runtime) return [];
	const descriptors = await options.runtime.listTools(options.context);
	const usedNames = new Set([...(options.existingToolNames ?? [])]);
	return descriptors.map((descriptor) => {
		const name = safeMcpToolName(descriptor.serverId, descriptor.name, usedNames);
		if (options.existingToolNames?.has(name)) {
			throw new ToolAuthorizationError(`MCP tool name conflict: ${name}`, 'mcp_tool_conflict');
		}
		const tool: AgentTool = {
			name,
			label: descriptor.name,
			description: descriptor.description,
			parameters: descriptor.parameters,
			async execute(_toolCallId, params, signal) {
				const result = await options.runtime!.callTool(descriptor.serverId, descriptor.name, params, signal);
				return normalizeMcpResult(result);
			},
		};
		options.diagnostics?.builtTools.push(name);
		return markMcpTool(tool, descriptor.serverId, descriptor.name);
	});
}

export function normalizeMcpResult(result: unknown) {
	if (typeof result === 'string') return payloadTextResult(result);
	if (typeof result === 'object' && result !== null && Array.isArray((result as { content?: unknown }).content)) {
		const candidate = result as { content: Array<Record<string, unknown>>; details?: unknown };
		return {
			content: candidate.content.map((entry) => {
				if (entry.type === 'image') {
					return {
						type: 'image' as const,
						data: String(entry.data ?? entry.base64 ?? ''),
						mimeType: String(entry.mimeType ?? 'image/png'),
					};
				}
				return { type: 'text' as const, text: String(entry.text ?? '') };
			}),
			details: candidate.details ?? result,
		};
	}
	return jsonResult(result);
}

