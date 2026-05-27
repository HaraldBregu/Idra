import type { AgentTool } from '../core/types';
import { textResult } from '../core/types';
import { toolDescription } from '../metadata';

type McpConnectors = {
	list(): Array<{ id: string; name: string; authKind?: string; status?: string; toolsCount?: number }>;
	reconnect(id: string): Promise<unknown>;
	refreshTools(id: string): Promise<unknown>;
	listTools(id: string): unknown;
	callTool(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown>;
	listResources(id: unknown, options?: unknown): Promise<unknown>;
	readResource(id: unknown, uri: unknown, options?: unknown): Promise<unknown>;
	listPrompts(id: unknown, options?: unknown): Promise<unknown>;
	getPrompt(id: unknown, name: unknown, args?: unknown, options?: unknown): Promise<unknown>;
};

export const listMcpServersTool: AgentTool = {
	name: 'list_mcp_servers',
	description: toolDescription('list_mcp_servers'),
	schema: emptySchema(),
	async execute(_args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('list_mcp_servers');
		return jsonText(connectors.list().filter((server) => server.authKind === 'mcp_env'));
	},
};

export const connectMcpServerTool: AgentTool<{ id: string }> = {
	name: 'connect_mcp_server',
	description: toolDescription('connect_mcp_server'),
	schema: idSchema(),
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('connect_mcp_server');
		try {
			return jsonText(await connectors.reconnect(args.id));
		} catch (error) {
			return textResult(`connect_mcp_server: ${(error as Error).message}`, true);
		}
	},
};

export const refreshMcpServerTool: AgentTool<{ id: string }> = {
	name: 'refresh_mcp_server',
	description: toolDescription('refresh_mcp_server'),
	schema: idSchema(),
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('refresh_mcp_server');
		try {
			return jsonText(await connectors.refreshTools(args.id));
		} catch (error) {
			return textResult(`refresh_mcp_server: ${(error as Error).message}`, true);
		}
	},
};

export const listMcpToolsTool: AgentTool<{ id: string }> = {
	name: 'list_mcp_tools',
	description: toolDescription('list_mcp_tools'),
	schema: idSchema(),
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('list_mcp_tools');
		try {
			return jsonText(connectors.listTools(args.id));
		} catch (error) {
			return textResult(`list_mcp_tools: ${(error as Error).message}`, true);
		}
	},
};

export const loadMcpToolTool: AgentTool<{ id: string; name: string }> = {
	name: 'load_mcp_tool',
	description: toolDescription('load_mcp_tool'),
	schema: namedSchema('MCP tool name.'),
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('load_mcp_tool');
		try {
			const tools = connectors.listTools(args.id);
			if (!Array.isArray(tools)) return textResult('load_mcp_tool: tool list is unavailable.', true);
			const tool = tools.find((entry) => entry && typeof entry === 'object' && (entry as { name?: unknown }).name === args.name);
			return tool ? jsonText(tool) : textResult(`load_mcp_tool: tool not found: ${args.name}`, true);
		} catch (error) {
			return textResult(`load_mcp_tool: ${(error as Error).message}`, true);
		}
	},
};

export const callMcpToolTool: AgentTool<{
	id: string;
	name: string;
	args?: Record<string, unknown>;
	options?: Record<string, unknown>;
}> = {
	name: 'call_mcp_tool',
	description: toolDescription('call_mcp_tool'),
	schema: {
		type: 'object',
		properties: {
			id: { type: 'string' },
			name: { type: 'string' },
			args: { type: 'object', additionalProperties: true },
			options: { type: 'object', additionalProperties: true },
		},
		required: ['id', 'name'],
		additionalProperties: false,
	},
	needsApproval: true,
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('call_mcp_tool');
		try {
			return jsonText(await connectors.callTool(args.id, args.name, args.args ?? {}, args.options));
		} catch (error) {
			return textResult(`call_mcp_tool: ${(error as Error).message}`, true);
		}
	},
};

export const listMcpResourcesTool: AgentTool<{ id: string; options?: Record<string, unknown> }> = {
	name: 'list_mcp_resources',
	description: toolDescription('list_mcp_resources'),
	schema: optionsSchema(),
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('list_mcp_resources');
		try {
			return jsonText(await connectors.listResources(args.id, args.options));
		} catch (error) {
			return textResult(`list_mcp_resources: ${(error as Error).message}`, true);
		}
	},
};

export const readMcpResourceTool: AgentTool<{ id: string; uri: string; options?: Record<string, unknown> }> = {
	name: 'read_mcp_resource',
	description: toolDescription('read_mcp_resource'),
	schema: {
		type: 'object',
		properties: {
			id: { type: 'string' },
			uri: { type: 'string' },
			options: { type: 'object', additionalProperties: true },
		},
		required: ['id', 'uri'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('read_mcp_resource');
		try {
			return jsonText(await connectors.readResource(args.id, args.uri, args.options));
		} catch (error) {
			return textResult(`read_mcp_resource: ${(error as Error).message}`, true);
		}
	},
};

export const listMcpPromptsTool: AgentTool<{ id: string; options?: Record<string, unknown> }> = {
	name: 'list_mcp_prompts',
	description: toolDescription('list_mcp_prompts'),
	schema: optionsSchema(),
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('list_mcp_prompts');
		try {
			return jsonText(await connectors.listPrompts(args.id, args.options));
		} catch (error) {
			return textResult(`list_mcp_prompts: ${(error as Error).message}`, true);
		}
	},
};

export const loadMcpPromptTool: AgentTool<{
	id: string;
	name: string;
	args?: Record<string, unknown>;
	options?: Record<string, unknown>;
}> = {
	name: 'load_mcp_prompt',
	description: toolDescription('load_mcp_prompt'),
	schema: {
		type: 'object',
		properties: {
			id: { type: 'string' },
			name: { type: 'string' },
			args: { type: 'object', additionalProperties: true },
			options: { type: 'object', additionalProperties: true },
		},
		required: ['id', 'name'],
		additionalProperties: false,
	},
	async execute(args, ctx) {
		const connectors = mcpConnectors(ctx);
		if (!connectors) return missing('load_mcp_prompt');
		try {
			return jsonText(await connectors.getPrompt(args.id, args.name, args.args ?? {}, args.options));
		} catch (error) {
			return textResult(`load_mcp_prompt: ${(error as Error).message}`, true);
		}
	},
};

function mcpConnectors(ctx: { services: unknown }): McpConnectors | undefined {
	const connectors = (ctx.services as { connectors?: Partial<McpConnectors> }).connectors;
	if (!connectors) return undefined;
	if (
		typeof connectors.list !== 'function' ||
		typeof connectors.reconnect !== 'function' ||
		typeof connectors.refreshTools !== 'function' ||
		typeof connectors.listTools !== 'function' ||
		typeof connectors.callTool !== 'function' ||
		typeof connectors.listResources !== 'function' ||
		typeof connectors.readResource !== 'function' ||
		typeof connectors.listPrompts !== 'function' ||
		typeof connectors.getPrompt !== 'function'
	) {
		return undefined;
	}
	return connectors as McpConnectors;
}

function jsonText(value: unknown) {
	return textResult(JSON.stringify(value, null, 2));
}

function missing(toolName: string) {
	return textResult(`${toolName}: ConnectorsService is unavailable.`, true);
}

function emptySchema() {
	return { type: 'object', properties: {}, required: [], additionalProperties: false };
}

function idSchema() {
	return {
		type: 'object',
		properties: { id: { type: 'string' } },
		required: ['id'],
		additionalProperties: false,
	};
}

function namedSchema(nameDescription: string) {
	return {
		type: 'object',
		properties: {
			id: { type: 'string' },
			name: { type: 'string', description: nameDescription },
		},
		required: ['id', 'name'],
		additionalProperties: false,
	};
}

function optionsSchema() {
	return {
		type: 'object',
		properties: {
			id: { type: 'string' },
			options: { type: 'object', additionalProperties: true },
		},
		required: ['id'],
		additionalProperties: false,
	};
}
