import type {
	ConnectorAuthKind,
	ConnectorConfig,
	ConnectorMcpConfig,
	ConnectorStatus,
} from '../../../shared/connector';
import type { ResolvedHttpMcpConfig, ResolvedMcpConfig, ResolvedStdioMcpConfig } from './types';

export function connectorStatusFor(connector: ConnectorConfig): ConnectorStatus {
	if (connector.enabled === false) return 'disabled';
	if (connector.oauth && !connectorHasAuthorization(connector)) return 'missing_auth';
	if (!connector.mcp) return 'missing_auth';
	if (isOAuthMcpConfig(connector.mcp) && !connectorHasAuthorization(connector)) return 'missing_auth';
	if (missingMcpSecretNames(connector).length > 0) return 'missing_auth';
	if (connector.lastError) return 'error';
	return 'configured';
}

export function connectorAuthKindFor(connector: ConnectorConfig): ConnectorAuthKind {
	return connector.oauth || isOAuthMcpConfig(connector.mcp) ? 'oauth' : 'mcp_env';
}

export function connectorHasAuthorization(connector: ConnectorConfig): boolean {
	return Boolean(
		connector.oauth?.token?.accessToken ||
		connector.authorization?.trim() ||
		authorizationFromMcp(connector.mcp)
	);
}

export function authorizationFromMcp(mcp: ConnectorMcpConfig | undefined): string {
	if (mcp?.transport !== 'http') return '';
	for (const [key, value] of Object.entries(mcp.headers ?? {})) {
		if (key.toLowerCase() === 'authorization') return value.trim();
	}
	return '';
}

export function isOAuthMcpConfig(mcp: ConnectorMcpConfig | undefined): boolean {
	if (mcp?.transport !== 'http') return false;
	return (
		mcp.url === 'https://gmailmcp.googleapis.com/mcp/v1' ||
		mcp.url === 'https://calendarmcp.googleapis.com/mcp/v1' ||
		mcp.url === 'https://drivemcp.googleapis.com/mcp/v1'
	);
}

export function missingMcpSecretNames(
	connector: ConnectorConfig,
	env: NodeJS.ProcessEnv = process.env
): string[] {
	const mcp = connector.mcp;
	if (!mcp) return [];
	if (mcp.transport === 'http') {
		const secret = mcp.auth?.env?.trim();
		return secret && !env[secret] ? [secret] : [];
	}
	return (mcp.envSecrets ?? [])
		.map((secret) => secret.env.trim())
		.filter((name) => name && !env[name]);
}

export function missingMcpSecretMessage(connector: ConnectorConfig): string | undefined {
	const missing = missingMcpSecretNames(connector);
	return missing.length > 0 ? 'Missing MCP secret environment variable: ' + missing.join(', ') : undefined;
}

export function resolveMcpConfig(
	connector: ConnectorConfig,
	env: NodeJS.ProcessEnv = process.env
): ResolvedMcpConfig {
	const mcp = connector.mcp;
	if (!mcp) throw new Error('Connector ' + (connector.name ?? connector.id ?? 'connector') + ' is missing MCP transport configuration.');
	if (mcp.transport === 'http') return resolveHttpConfig(connector, mcp, env);
	return resolveStdioConfig(mcp, env);
}

function resolveHttpConfig(
	connector: ConnectorConfig,
	mcp: Extract<ConnectorMcpConfig, { transport: 'http' }>,
	env: NodeJS.ProcessEnv
): ResolvedHttpMcpConfig {
	const headers = { ...(mcp.headers ?? {}) };
	const authEnv = mcp.auth?.env?.trim();
	const authorization = connector.authorization?.trim();
	if (authEnv) {
		const secret = env[authEnv];
		if (!secret) throw new Error('Missing MCP secret environment variable: ' + authEnv);
		const header = mcp.auth?.header?.trim() || 'Authorization';
		const scheme = mcp.auth?.scheme ?? 'bearer';
		headers[header] = header.toLowerCase() === 'authorization' && scheme === 'bearer'
			? 'Bearer ' + secret
			: secret;
	} else if (connector.oauth?.token?.accessToken) {
		headers.Authorization = 'Bearer ' + connector.oauth.token.accessToken;
	} else if (authorization) {
		headers.Authorization = authorization;
	}
	return {
		transport: 'http',
		url: mcp.url,
		method: mcp.method,
		headers: Object.keys(headers).length > 0 ? headers : undefined,
		sessionId: mcp.sessionId,
	};
}

function resolveStdioConfig(
	mcp: Extract<ConnectorMcpConfig, { transport: 'stdio' }>,
	env: NodeJS.ProcessEnv
): ResolvedStdioMcpConfig {
	const resolvedEnv = { ...(mcp.env ?? {}) };
	for (const secret of mcp.envSecrets ?? []) {
		const source = secret.env.trim();
		const target = secret.target.trim();
		if (!source || !target) continue;
		const value = env[source];
		if (!value) throw new Error('Missing MCP secret environment variable: ' + source);
		resolvedEnv[target] = value;
	}
	return {
		transport: 'stdio',
		command: mcp.command,
		args: mcp.args,
		cwd: mcp.cwd,
		env: Object.keys(resolvedEnv).length > 0 ? resolvedEnv : undefined,
	};
}
