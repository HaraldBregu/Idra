import path from 'node:path';
import type { ConnectorApprovalMode, ConnectorInput } from '../../../shared/connector';
import { cloneValue, uniqueStrings } from './runtime';

export function sanitizeInput(input: unknown): ConnectorInput {
	const raw = requireObject(input, 'Connector configuration');
	const name = readOptionalString(raw, 'name')?.trim() ?? '';
	const connectorId = readOptionalString(raw, 'connectorId')?.trim() ?? '';
	const serverLabel = readOptionalString(raw, 'serverLabel')?.trim() || serverLabelFromName(name);
	const serverUrl = readOptionalString(raw, 'serverUrl')?.trim() || undefined;
	const serverDescription = readOptionalString(raw, 'serverDescription')?.trim();
	const authorization = readOptionalString(raw, 'authorization')?.trim() ?? '';
	const requireApproval = readOptionalApprovalMode(raw, 'requireApproval') ?? 'always';
	const allowedTools = readOptionalStringArray(raw, 'allowedTools') ?? [];
	const deferLoading = readOptionalBoolean(raw, 'deferLoading') ?? false;
	const enabled = readOptionalBoolean(raw, 'enabled') ?? true;
	const mcp = readOptionalMcp(raw, 'mcp');
	const openAiResponsesConnector = !mcp || Boolean(serverUrl);

	if (!name) throw new Error('Connector name is required.');
	if (!connectorId) throw new Error('Connector id is required.');
	if (serverUrl) validateOpenAiServerUrl(serverUrl);
	if (serverUrl && mcp) throw new Error('Connector cannot define both serverUrl and local MCP configuration.');
	if (!serverLabel) throw new Error('Server label is required.');
	if (!/^[a-zA-Z0-9_-]+$/.test(serverLabel)) {
		throw new Error('Server label can contain only letters, numbers, underscores, and hyphens.');
	}
	if (authorization && !openAiResponsesConnector) {
		throw new Error('Connector authorization secrets must be referenced from environment variables.');
	}
	if (!openAiResponsesConnector) {
		if (!mcp) throw new Error('MCP transport configuration is required.');
		validateMcpConfig(mcp);
	}

	return {
		name,
		connectorId,
		serverLabel,
		serverDescription,
		serverUrl,
		authorization: openAiResponsesConnector ? authorization : '',
		requireApproval,
		allowedTools: uniqueStrings(allowedTools),
		deferLoading,
		enabled,
		mcp: openAiResponsesConnector ? undefined : mcp,
	};
}

export function serverLabelFromName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

export function readOptionalString(params: Record<string, unknown>, key: string): string | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(`${key} must be a string.`);
	return value;
}

export function readOptionalBoolean(params: Record<string, unknown>, key: string): boolean | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'boolean') throw new Error(`${key} must be a boolean.`);
	return value;
}

export function readOptionalStringArray(params: Record<string, unknown>, key: string): string[] | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
		throw new Error(`${key} must be an array of strings.`);
	}
	return value.map((entry) => entry.trim()).filter(Boolean);
}

export function readOptionalApprovalMode(params: Record<string, unknown>, key: string): ConnectorApprovalMode | undefined {
	const value = readOptionalString(params, key);
	if (value === undefined) return undefined;
	if (value === 'always' || value === 'never' || value === 'never_for_allowed_tools') return value;
	throw new Error(`${key} must be one of: always, never, never_for_allowed_tools.`);
}

export function readOptionalMcp(params: Record<string, unknown>, key: string): ConnectorInput['mcp'] | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	return cloneValue(requireObject(value, key)) as unknown as ConnectorInput['mcp'];
}

export function requireObject(value: unknown, label: string): Record<string, unknown> {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	throw new Error(`${label} is required.`);
}

function validateMcpConfig(mcp: ConnectorInput['mcp']): void {
	if (!mcp || typeof mcp !== 'object') throw new Error('MCP transport configuration is required.');
	if (mcp.transport === 'http') {
		const url = new URL(mcp.url);
		if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
			throw new Error('Remote MCP servers must use HTTPS unless local.');
		}
		for (const [key, value] of Object.entries(mcp.headers ?? {})) {
			if (isSecretHeader(key) && value.trim()) {
				throw new Error('MCP secret headers must be provided through environment variables.');
			}
		}
		return;
	}
	if (mcp.transport === 'stdio') {
		if (!path.isAbsolute(mcp.command)) throw new Error(`MCP command must be absolute: ${mcp.command}`);
		return;
	}
	throw new Error('Unsupported MCP transport configuration.');
}

function validateOpenAiServerUrl(serverUrl: string): void {
	const url = new URL(serverUrl);
	if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
		throw new Error('Remote MCP servers must use HTTPS unless local.');
	}
}

function isSecretHeader(key: string): boolean {
	return /(authorization|api[-_]?key|token|secret)/i.test(key);
}
