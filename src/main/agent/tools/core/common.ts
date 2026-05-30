import type { JSONSchema } from '../../../provider/types';

export type ToolContent =
	| { type: 'text'; text: string }
	| { type: 'image'; data: string; mimeType: string };

export type AgentToolResult<TDetails = unknown> = {
	content: ToolContent[];
	details: TDetails;
	terminate?: boolean;
};

export type AgentToolUpdate = {
	type: string;
	message?: string;
	details?: unknown;
};

export type AgentTool<TParamsSchema = JSONSchema, TDetails = unknown> = {
	name: string;
	label?: string;
	description: string;
	parameters: TParamsSchema;
	ownerOnly?: boolean;
	displaySummary?: string;
	prepareArguments?: (args: unknown) => unknown;
	execute: (
		toolCallId: string,
		params: unknown,
		signal?: AbortSignal,
		onUpdate?: (update: AgentToolUpdate) => void
	) => Promise<AgentToolResult<TDetails>>;
};

export type ToolOwnerKind = 'core' | 'plugin' | 'mcp' | 'lsp' | 'client';

export type ToolMetadata = {
	ownerKind: ToolOwnerKind;
	pluginId?: string;
	serverId?: string;
	channel?: string;
	optional?: boolean;
	declaredName?: string;
	wrapped?: boolean;
	clientHosted?: boolean;
};

const metadataByTool = new WeakMap<AgentTool, ToolMetadata>();

export class ToolInputError extends Error {
	constructor(
		message: string,
		public readonly details?: unknown
	) {
		super(message);
		this.name = 'ToolInputError';
	}
}

export class ToolAuthorizationError extends Error {
	constructor(
		message: string,
		public readonly deniedReason = message,
		public readonly details?: unknown
	) {
		super(message);
		this.name = 'ToolAuthorizationError';
	}
}

export type FilteredToolDiagnostic = {
	toolName: string;
	stage: string;
	reason: string;
};

export type ToolDiagnosticEvent = {
	type: string;
	message?: string;
	details?: unknown;
};

export type ToolDiagnostics = {
	builtTools: string[];
	filteredTools: FilteredToolDiagnostic[];
	warnings: string[];
	events: ToolDiagnosticEvent[];
	emit: (event: ToolDiagnosticEvent) => void;
};

export function createToolDiagnostics(): ToolDiagnostics {
	const diagnostics: ToolDiagnostics = {
		builtTools: [],
		filteredTools: [],
		warnings: [],
		events: [],
		emit(event) {
			diagnostics.events.push(event);
		},
	};
	return diagnostics;
}

export function normalizeToolName(name: string): string {
	return name.trim().toLowerCase();
}

export function toProviderSafeName(name: string): string {
	const normalized = normalizeToolName(name)
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/_+/g, '_')
		.replace(/^_+|_+$/g, '');
	return normalized || 'tool';
}

export function getToolMetadata(tool: AgentTool): ToolMetadata | undefined {
	return metadataByTool.get(tool);
}

export function setToolMetadata<TTool extends AgentTool>(
	tool: TTool,
	metadata: ToolMetadata
): TTool {
	metadataByTool.set(tool, metadata);
	return tool;
}

export function copyToolMetadata(source: AgentTool, target: AgentTool): void {
	const metadata = getToolMetadata(source);
	if (metadata) metadataByTool.set(target, { ...metadata });
}

export function markCoreTool<TTool extends AgentTool>(tool: TTool, optional = false): TTool {
	return setToolMetadata(tool, { ownerKind: 'core', optional });
}

export function markPluginTool<TTool extends AgentTool>(
	tool: TTool,
	pluginId: string,
	optional = false
): TTool {
	return setToolMetadata(tool, { ownerKind: 'plugin', pluginId, optional });
}

export function markMcpTool<TTool extends AgentTool>(
	tool: TTool,
	serverId: string,
	declaredName: string
): TTool {
	return setToolMetadata(tool, { ownerKind: 'mcp', serverId, declaredName });
}

export function markLspTool<TTool extends AgentTool>(tool: TTool): TTool {
	return setToolMetadata(tool, { ownerKind: 'lsp' });
}

export function markClientTool<TTool extends AgentTool>(
	tool: TTool,
	channel?: string
): TTool {
	return setToolMetadata(tool, { ownerKind: 'client', channel, clientHosted: true });
}

export function isAgentTool(value: unknown): value is AgentTool {
	if (typeof value !== 'object' || value === null) return false;
	const candidate = value as Partial<AgentTool>;
	return (
		typeof candidate.name === 'string' &&
		typeof candidate.description === 'string' &&
		'parameters' in candidate &&
		typeof candidate.execute === 'function'
	);
}

export function assertUniqueToolNames(tools: AgentTool[]): void {
	const seen = new Map<string, string>();
	for (const tool of tools) {
		const normalized = normalizeToolName(tool.name);
		const existing = seen.get(normalized);
		if (existing) {
			throw new ToolAuthorizationError(`tool name collision: ${existing} and ${tool.name}`, 'name_collision', {
				existing,
				duplicate: tool.name,
			});
		}
		seen.set(normalized, tool.name);
	}
}

export function sanitizeParamPreview(value: unknown): unknown {
	if (Array.isArray(value)) return value.slice(0, 8).map((entry) => sanitizeParamPreview(entry));
	if (typeof value !== 'object' || value === null) {
		if (typeof value === 'string' && value.length > 160) return `${value.slice(0, 160)}...`;
		return value;
	}

	const output: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (/api[_-]?key|authorization|credential|password|secret|token/i.test(key)) {
			output[key] = '[redacted]';
		} else {
			output[key] = sanitizeParamPreview(entry);
		}
	}
	return output;
}

