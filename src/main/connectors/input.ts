import type {
	ConnectorAuthKind,
	ConnectorConfig,
	ConnectorInput,
	ConnectorMcpConfig,
	ConnectorMcpEnvSecret,
	ConnectorMcpHeaderSecret,
	ConnectorProviderId,
} from '../../shared/connector';
import { serverLabelFromName } from './format';

const SERVER_LABEL_PATTERN = /^[a-zA-Z0-9_-]+$/;
const CONNECTOR_ID_PATTERN = /^[a-zA-Z0-9._:-]+$/;
const ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const SECRET_HEADER_NAMES = new Set(['authorization', 'x-api-key', 'api-key']);

export type SanitizedConnectorInput = ConnectorInput & {
	connectorId: ConnectorProviderId;
	serverLabel: string;
	mcp: ConnectorMcpConfig;
};

export function sanitizeConnectorInput(input: unknown, current?: ConnectorConfig): SanitizedConnectorInput {
	const raw = requireObject(input, current ? 'Connector update' : 'Connector configuration');
	const name = readOptionalString(raw, 'name')?.trim() ?? current?.name ?? '';
	const serverLabel = readOptionalString(raw, 'serverLabel')?.trim() || current?.serverLabel || serverLabelFromName(name);
	const connectorId = readOptionalString(raw, 'connectorId')?.trim() ?? current?.connectorId ?? serverLabel;
	const serverDescription = readOptionalString(raw, 'serverDescription')?.trim() || current?.serverDescription;
	const authorization = readOptionalString(raw, 'authorization')?.trim();
	const authKind = readOptionalAuthKind(raw, 'authKind') ?? current?.authKind;
	const requireApproval = readOptionalApprovalMode(raw, 'requireApproval') ?? current?.requireApproval ?? 'always';
	const allowedTools = readOptionalStringArray(raw, 'allowedTools') ?? current?.allowedTools ?? [];
	const deferLoading = readOptionalBoolean(raw, 'deferLoading') ?? current?.deferLoading ?? false;
	const enabled = readOptionalBoolean(raw, 'enabled') ?? current?.enabled ?? true;
	const mcp = sanitizeMcpConfig(raw.mcp, current?.mcp);

	if (!name) throw new Error('Connector name is required.');
	assertConnectorId(connectorId);
	if (!serverLabel) throw new Error('Server label is required.');
	if (!SERVER_LABEL_PATTERN.test(serverLabel)) {
		throw new Error('Server label can contain only letters, numbers, underscores, and hyphens.');
	}
	if (authorization) {
		throw new Error('Connector secrets must be stored in environment variables and referenced from MCP config.');
	}
	if (!mcp) throw new Error('MCP transport configuration is required.');

	return {
		name,
		connectorId,
		authKind,
		serverLabel,
		serverDescription,
		authorization: '',
		requireApproval,
		allowedTools: Array.from(new Set(allowedTools)),
		deferLoading,
		enabled,
		mcp,
	};
}

export function assertConnectorId(value: string): void {
	if (!value) throw new Error('Connector id is required.');
	if (!CONNECTOR_ID_PATTERN.test(value)) {
		throw new Error('Connector id can contain only letters, numbers, dots, colons, underscores, and hyphens.');
	}
}

function requireObject(value: unknown, label: string): Record<string, unknown> {
	if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
		return value as Record<string, unknown>;
	}
	throw new Error(label + ' is required.');
}

function readOptionalString(params: Record<string, unknown>, key: string): string | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'string') throw new Error(key + ' must be a string.');
	return value;
}

function readRequiredString(value: unknown, label: string): string {
	if (typeof value !== 'string') throw new Error(label + ' must be a string.');
	const trimmed = value.trim();
	if (!trimmed) throw new Error(label + ' is required.');
	return trimmed;
}

function readOptionalBoolean(params: Record<string, unknown>, key: string): boolean | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (typeof value !== 'boolean') throw new Error(key + ' must be a boolean.');
	return value;
}

function readOptionalStringArray(params: Record<string, unknown>, key: string): string[] | undefined {
	const value = params[key];
	if (value === undefined || value === null) return undefined;
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
		throw new Error(key + ' must be an array of strings.');
	}
	return value.map((entry) => entry.trim()).filter(Boolean);
}

function readOptionalApprovalMode(
	params: Record<string, unknown>,
	key: string
): ConnectorInput['requireApproval'] | undefined {
	const value = readOptionalString(params, key);
	if (value === undefined) return undefined;
	if (value === 'always' || value === 'never' || value === 'never_for_allowed_tools') return value;
	throw new Error(key + ' must be one of: always, never, never_for_allowed_tools.');
}

function readOptionalAuthKind(params: Record<string, unknown>, key: string): ConnectorAuthKind | undefined {
	const value = readOptionalString(params, key);
	if (value === undefined) return undefined;
	if (value === 'mcp_env' || value === 'oauth') return value;
	throw new Error(key + ' must be one of: mcp_env, oauth.');
}

function sanitizeMcpConfig(value: unknown, current?: ConnectorMcpConfig): ConnectorMcpConfig | undefined {
	if (value === undefined || value === null) return current;
	const raw = requireObject(value, 'MCP configuration');
	const transport = readOptionalString(raw, 'transport')?.trim();
	if (transport === 'http') return sanitizeHttpMcpConfig(raw, current?.transport === 'http' ? current : undefined);
	if (transport === 'stdio') return sanitizeStdioMcpConfig(raw, current?.transport === 'stdio' ? current : undefined);
	throw new Error('MCP transport must be one of: http, stdio.');
}

function sanitizeHttpMcpConfig(
	raw: Record<string, unknown>,
	current?: Extract<ConnectorMcpConfig, { transport: 'http' }>
): ConnectorMcpConfig {
	const url = readOptionalString(raw, 'url')?.trim() ?? current?.url ?? '';
	if (!url) throw new Error('MCP HTTP url is required.');
	const parsedUrl = new URL(url);
	if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
		throw new Error('MCP HTTP url must use http or https.');
	}
	const method = readOptionalString(raw, 'method')?.trim().toUpperCase() || current?.method;
	if (method && method !== 'POST') throw new Error('MCP HTTP method must be POST.');
	return {
		transport: 'http',
		url: parsedUrl.toString(),
		method: method as 'POST' | undefined,
		headers: sanitizeHeaderRecord(raw.headers, current?.headers),
		sessionId: readOptionalString(raw, 'sessionId')?.trim() || current?.sessionId,
		auth: sanitizeHeaderSecret(raw.auth, current?.auth),
	};
}

function sanitizeStdioMcpConfig(
	raw: Record<string, unknown>,
	current?: Extract<ConnectorMcpConfig, { transport: 'stdio' }>
): ConnectorMcpConfig {
	const command = readOptionalString(raw, 'command')?.trim() ?? current?.command ?? '';
	if (!command) throw new Error('MCP stdio command is required.');
	return {
		transport: 'stdio',
		command,
		args: readOptionalStringArray(raw, 'args') ?? current?.args,
		cwd: readOptionalString(raw, 'cwd')?.trim() || current?.cwd,
		env: sanitizeEnvRecord(raw.env, current?.env),
		envSecrets: sanitizeEnvSecrets(raw.envSecrets, current?.envSecrets),
	};
}

function sanitizeHeaderRecord(value: unknown, current?: Record<string, string>): Record<string, string> | undefined {
	if (value === undefined || value === null) return current;
	const raw = requireObject(value, 'MCP headers');
	const headers: Record<string, string> = {};
	for (const [key, entry] of Object.entries(raw)) {
		if (typeof entry !== 'string') throw new Error('MCP header values must be strings.');
		const header = key.trim();
		if (!header) continue;
		if (SECRET_HEADER_NAMES.has(header.toLowerCase())) {
			throw new Error('MCP secret headers must be configured with an environment variable auth reference.');
		}
		headers[header] = entry;
	}
	return Object.keys(headers).length > 0 ? headers : undefined;
}

function sanitizeEnvRecord(value: unknown, current?: Record<string, string>): Record<string, string> | undefined {
	if (value === undefined || value === null) return current;
	const raw = requireObject(value, 'MCP env');
	const env: Record<string, string> = {};
	for (const [key, entry] of Object.entries(raw)) {
		if (typeof entry !== 'string') throw new Error('MCP env values must be strings.');
		const name = key.trim();
		if (!name) continue;
		assertEnvName(name, 'MCP env name');
		env[name] = entry;
	}
	return Object.keys(env).length > 0 ? env : undefined;
}

function sanitizeHeaderSecret(value: unknown, current?: ConnectorMcpHeaderSecret): ConnectorMcpHeaderSecret | undefined {
	if (value === undefined || value === null) return current;
	const raw = requireObject(value, 'MCP auth');
	const env = readRequiredString(raw.env, 'MCP auth env');
	assertEnvName(env, 'MCP auth env');
	const header = readOptionalString(raw, 'header')?.trim();
	const scheme = readOptionalString(raw, 'scheme')?.trim() ?? current?.scheme ?? 'bearer';
	if (scheme !== 'bearer' && scheme !== 'raw') throw new Error('MCP auth scheme must be bearer or raw.');
	return {
		env,
		header: header || current?.header,
		scheme,
	};
}

function sanitizeEnvSecrets(value: unknown, current?: ConnectorMcpEnvSecret[]): ConnectorMcpEnvSecret[] | undefined {
	if (value === undefined || value === null) return current;
	if (!Array.isArray(value)) throw new Error('MCP envSecrets must be an array.');
	const secrets = value.map((entry) => {
		const raw = requireObject(entry, 'MCP env secret');
		const env = readRequiredString(raw.env, 'MCP env secret source');
		const target = readRequiredString(raw.target, 'MCP env secret target');
		assertEnvName(env, 'MCP env secret source');
		assertEnvName(target, 'MCP env secret target');
		return { env, target };
	});
	return secrets.length > 0 ? secrets : undefined;
}

function assertEnvName(value: string, label: string): void {
	if (!ENV_NAME_PATTERN.test(value)) throw new Error(label + ' must be a valid environment variable name.');
}
