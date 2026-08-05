import { BrowserWindow, dialog, shell } from 'electron';
import { mkdirSync } from 'node:fs';
import { auth } from '@modelcontextprotocol/sdk/client/auth.js';
import type { EventBus } from '../event_bus';
import { McpChannels } from '../../shared/ipc_channels_definitions';
import {
	createOAuthProvider,
	deleteMcpServer,
	getMcpOauth,
	getMcpServers,
	importLocalMcpServers,
	listMcpRegistry,
	mcpLocalRoot,
	saveMcpOauth,
	setMcpServers,
	startOauthCallbackServer,
	testMcpServer,
	upsertMcpServer,
	type McpOAuthStorage,
} from '../mcp';
import type { McpData, McpOAuthStart, McpSettings } from '../../shared/mcp_types';
import { registerCommand, registerCommandWithEvent, registerQuery } from './core/gateway';
import type { IpcModule } from './core/module';

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resolveMcpId(value: string | undefined): string {
	const id = value?.trim().toLowerCase();
	if (!id) throw new Error('Connector ID is required.');
	return id;
}

function inferMcpType(entry: McpData): McpData {
	const shape = entry as { type?: string; command?: unknown; url?: unknown };
	if (shape.type) return entry;
	if (typeof shape.command === 'string') return { ...entry, type: 'stdio' } as McpData;
	if (typeof shape.url === 'string') return { ...entry, type: 'http' } as McpData;
	return entry;
}

function isStringRecord(value: unknown): value is Record<string, string> {
	if (!isRecord(value)) return false;
	return Object.values(value).every((item) => typeof item === 'string');
}

function hasCommonMcpFields(value: Record<string, unknown>): boolean {
	return (
		(value.name === undefined || typeof value.name === 'string') &&
		(value.require_approval === undefined ||
			value.require_approval === 'always' ||
			value.require_approval === 'never') &&
		(value.defer_loading === undefined || typeof value.defer_loading === 'boolean') &&
		(value.enabled === undefined || typeof value.enabled === 'boolean') &&
		(value.created_at === undefined || typeof value.created_at === 'string') &&
		(value.updated_at === undefined || typeof value.updated_at === 'string') &&
		(value.last_error === undefined || typeof value.last_error === 'string')
	);
}

function isMcpEntry(value: unknown): value is McpData {
	if (!isRecord(value)) return false;
	if (value.type === 'stdio') {
		return (
			typeof value.command === 'string' &&
			(value.args === undefined || Array.isArray(value.args)) &&
			(value.env === undefined || isStringRecord(value.env)) &&
			(value.cwd === undefined || typeof value.cwd === 'string') &&
			hasCommonMcpFields(value)
		);
	}
	if (value.type === 'http') {
		return (
			typeof value.url === 'string' &&
			(value.token === undefined || typeof value.token === 'string') &&
			(value.client_id === undefined || typeof value.client_id === 'string') &&
			(value.client_secret === undefined || typeof value.client_secret === 'string') &&
			hasCommonMcpFields(value)
		);
	}
	return false;
}

function normalizeMcpSettings(value: unknown): McpSettings {
	if (!isRecord(value)) return {};
	const connectors: McpSettings = {};
	for (const [rawId, rawEntry] of Object.entries(value)) {
		const id = rawId.trim().toLowerCase();
		if (!id || !isMcpEntry(rawEntry)) continue;
		connectors[id] = rawEntry;
	}
	return connectors;
}

function listMcp(): McpSettings {
	const servers = getMcpServers();
	const out: McpSettings = {};
	for (const [id, entry] of Object.entries(servers)) out[id] = inferMcpType(entry);
	return out;
}

function oauthStorage(id: string): McpOAuthStorage {
	return {
		load: () => getMcpOauth(id),
		save: (state) => saveMcpOauth(id, state),
	};
}

function getHttpMcpServer(id: string): {
	id: string;
	url: string;
	clientId?: string;
	clientSecret?: string;
} {
	const connectorId = resolveMcpId(id);
	const entry = listMcp()[connectorId];
	if (!entry || entry.type !== 'http') throw new Error(`No http MCP server "${id}".`);
	return {
		id: connectorId,
		url: entry.url,
		clientId: entry.client_id,
		clientSecret: entry.client_secret,
	};
}

export class McpIpc implements IpcModule {
	readonly name = 'mcp';

	register(_deps: void, _eventBus: EventBus): void {
		registerQuery(McpChannels.list, () => listMcp());

		registerQuery(McpChannels.get, (id: string) => {
			const connectorId = resolveMcpId(id);
			const connector = listMcp()[connectorId];
			return connector ? { [connectorId]: connector } : {};
		});

		registerCommand(McpChannels.save, (input: McpSettings) => {
			const next = normalizeMcpSettings(input);
			setMcpServers(next);
			return next;
		});

		registerCommand(McpChannels.upsert, (id: string, input: McpData) => {
			const connectorId = resolveMcpId(id);
			const entry = normalizeMcpSettings({ [connectorId]: input })[connectorId];
			if (!entry) throw new Error('Invalid MCP server configuration.');
			upsertMcpServer(connectorId, entry);
			return listMcp();
		});

		registerCommand(McpChannels.delete, (id: string) => {
			const connectorId = resolveMcpId(id);
			deleteMcpServer(connectorId);
		});

		registerQuery(McpChannels.registry, () => listMcpRegistry());

		registerCommandWithEvent(McpChannels.importLocal, async (event) => {
			const window = BrowserWindow.fromWebContents(event.sender);
			const options: Electron.OpenDialogOptions = {
				title: 'Select local MCP server folder(s)',
				properties: ['openDirectory', 'multiSelections'],
			};
			const result = window
				? await dialog.showOpenDialog(window, options)
				: await dialog.showOpenDialog(options);
			if (result.canceled) return undefined;
			return importLocalMcpServers(result.filePaths);
		});

		registerQuery(McpChannels.getRoot, () => mcpLocalRoot());

		registerCommand(McpChannels.openRoot, async () => {
			const root = mcpLocalRoot();
			mkdirSync(root, { recursive: true });
			const error = await shell.openPath(root);
			if (error) throw new Error(error);
		});

		registerCommand(McpChannels.test, (id: string) => testMcpServer(resolveMcpId(id)));

		registerCommand(McpChannels.oauthStart, async (id: string): Promise<McpOAuthStart> => {
			const server = getHttpMcpServer(id);
			let redirectUrl: string | undefined;
			const provider = () =>
				createOAuthProvider({
					storage: oauthStorage(server.id),
					clientId: server.clientId,
					clientSecret: server.clientSecret,
					onRedirect: (url) => {
						redirectUrl = url.toString();
					},
				});
			const result = await auth(provider(), { serverUrl: server.url });
			if (result === 'AUTHORIZED') return { status: 'authorized' };
			if (!redirectUrl) throw new Error(`MCP server "${id}" did not return an authorization URL.`);

			let callback: Awaited<ReturnType<typeof startOauthCallbackServer>>;
			try {
				callback = await startOauthCallbackServer();
			} catch {
				// ponytail: callback port busy → fall back to the manual paste flow
				return { status: 'redirect', url: redirectUrl };
			}
			try {
				await shell.openExternal(redirectUrl);
				const code = await callback.code;
				const finish = await auth(provider(), { serverUrl: server.url, authorizationCode: code });
				if (finish !== 'AUTHORIZED') throw new Error(`OAuth authorization failed for "${id}".`);
				return { status: 'authorized' };
			} finally {
				callback.close();
			}
		});

		registerCommand(McpChannels.oauthFinish, async (id: string, code: string): Promise<void> => {
			const server = getHttpMcpServer(id);
			const result = await auth(
				createOAuthProvider({
					storage: oauthStorage(server.id),
					clientId: server.clientId,
					clientSecret: server.clientSecret,
				}),
				{ serverUrl: server.url, authorizationCode: code }
			);
			if (result !== 'AUTHORIZED') throw new Error(`OAuth authorization failed for "${id}".`);
		});
	}
}
