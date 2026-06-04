import { Client } from '@modelcontextprotocol/sdk/client';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { RequestOptions } from '@modelcontextprotocol/sdk/shared/protocol.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { ConnectorsService } from '../../../connectors';

type StoredConnector = ReturnType<ConnectorsService['listStored']>[number];
type RemoteMcpOperation<T> = (client: Client, options: RequestOptions) => Promise<T>;

const DEFAULT_TIMEOUT_MS = 30_000;

export async function withRemoteMcpClient<T>(
	connector: StoredConnector,
	operation: RemoteMcpOperation<T>,
	options?: unknown
): Promise<T> {
	const serverUrl = connector.serverUrl?.trim();
	if (!serverUrl) throw new Error(`MCP server URL is missing for ${connector.name}.`);
	const requestOptions = toRequestOptions(options);
	const errors: string[] = [];
	for (const attempt of transportsFor(connector, serverUrl)) {
		const client = new Client({ name: 'friday', version: '1.0.0' }, { capabilities: {} });
		try {
			await client.connect(attempt.transport, requestOptions);
			return await operation(client, requestOptions);
		} catch (error) {
			errors.push(`${attempt.label}: ${errorMessage(error)}`);
		} finally {
			await client.close().catch(() => undefined);
		}
	}
	throw new Error(`Unable to connect to MCP server ${connector.serverLabel}: ${errors.join('; ')}`);
}

function transportsFor(
	connector: StoredConnector,
	serverUrl: string
): Array<{ label: string; transport: Transport }> {
	const url = new URL(serverUrl);
	const requestInit = requestInitFor(connector);
	return [
		{
			label: 'streamable_http',
			transport: new StreamableHTTPClientTransport(url, { requestInit }),
		},
		{
			label: 'sse',
			transport: new SSEClientTransport(url, {
				requestInit,
				eventSourceInit: requestInit ? { fetch: eventSourceFetch(requestInit) } : undefined,
			}),
		},
	];
}

function requestInitFor(connector: StoredConnector): RequestInit | undefined {
	const authorization = connectorAuthorization(connector);
	if (!authorization) return undefined;
	return { headers: { Authorization: authorizationHeader(authorization) } };
}

function eventSourceFetch(requestInit: RequestInit): typeof fetch {
	return (input, init) => fetch(input, { ...init, headers: requestInit.headers });
}

function authorizationHeader(value: string): string {
	return /^(bearer|basic)\s+/iu.test(value) ? value : `Bearer ${value}`;
}

function connectorAuthorization(connector: StoredConnector): string {
	return (
		connector.authorization?.trim() ||
		connector.oauth?.token?.accessToken?.trim() ||
		connector.oauth?.accessToken?.trim() ||
		''
	);
}

function toRequestOptions(value: unknown): RequestOptions {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return { timeout: DEFAULT_TIMEOUT_MS };
	}
	const timeout = (value as { timeout?: unknown }).timeout;
	return {
		timeout:
			typeof timeout === 'number' && Number.isFinite(timeout) && timeout > 0
				? timeout
				: DEFAULT_TIMEOUT_MS,
	};
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
