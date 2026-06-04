import type { ConnectorApprovalMode, ConnectorInput } from '../../shared/connectors';
import { uniqueStrings } from './runtime';

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

	if (!name) throw new Error('Connector name is required.');
	if (!connectorId) throw new Error('Connector id is required.');
	if (serverUrl) validateOpenAiServerUrl(serverUrl);
	if (!serverLabel) throw new Error('Server label is required.');
	if (!/^[a-zA-Z0-9_-]+$/.test(serverLabel)) {
		throw new Error('Server label can contain only letters, numbers, underscores, and hyphens.');
	}

	return {
		name,
		connectorId,
		serverLabel,
		serverDescription,
		serverUrl,
		authorization,
		requireApproval,
		allowedTools: uniqueStrings(allowedTools),
		deferLoading,
		enabled,
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

export function requireObject(value: unknown, label: string): Record<string, unknown> {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	throw new Error(`${label} is required.`);
}

function validateOpenAiServerUrl(serverUrl: string): void {
	const url = new URL(serverUrl);
	if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
		throw new Error('Remote MCP servers must use HTTPS unless local.');
	}
}
