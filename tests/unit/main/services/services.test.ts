import path from 'node:path';
import { promises as fs } from 'node:fs';
import { app, shell } from 'electron';
import { AppsService } from '../../../../src/main/apps';
import { ConnectorsService } from '../../../../src/main/connectors';
import {
	buildGoogleAuthorizationUrl,
	scopesForGmailTools,
	scopesForGoogleCalendarTools,
} from '../../../../src/main/connectors/google';
import { LoggerService, LogLevel } from '../../../../src/main/logger';
import { UserDataDirectoryService } from '../../../../src/main/user-data';
import { WorkspaceService } from '../../../../src/main/workspace';
import { makeLogger, makeTempDir } from '../test-helpers';

describe('apps service', () => {
	it('lists valid app manifests with embedded icons and validates ids for destructive operations', async () => {
		const tempRoot = await makeTempDir();
		const userDataDirectory = new UserDataDirectoryService({ homePath: tempRoot });
		const service = new AppsService(makeLogger() as never, userDataDirectory);
		const root = service.getAppsRoot();
		await fs.mkdir(path.join(root, 'alpha'), { recursive: true });
		await fs.writeFile(path.join(root, 'alpha', 'icon.png'), Buffer.from('icon'));
		await fs.writeFile(path.join(root, 'alpha', 'manifest.json'), JSON.stringify({ name: 'Alpha', version: '1.0.0', icon: 'icon.png' }));

		const apps = await service.list();
		expect(apps).toHaveLength(1);
		expect(apps[0]?.iconDataUrl).toContain('data:image/png;base64');

		await service.openFolder('alpha');
		expect(shell.openPath).toHaveBeenCalledWith(path.join(root, 'alpha'));
		(shell.openPath as jest.Mock).mockResolvedValueOnce('permission denied');
		await expect(service.openFolder('alpha')).rejects.toThrow(/Could not open app folder/);
		await expect(service.delete('../bad')).rejects.toThrow(/Invalid app id/);
		await fs.rm(tempRoot, { recursive: true, force: true });
	});
});

describe('connectors service', () => {
	it('adds, lists, updates, tests, and removes connector configs', async () => {
		let connectors: unknown[] = [];
		const store = {
			getConnectors: jest.fn(() => connectors),
			setConnectors: jest.fn((next: unknown[]) => { connectors = next; }),
		};
		const service = new ConnectorsService(store as never, makeLogger() as never);
		const added = await service.add({
			name: 'My Gmail',
			connectorId: 'connector_gmail',
			authorization: 'token',
			allowedTools: ['get_profile'],
			requireApproval: 'never_for_allowed_tools',
		});

		expect(added.serverLabel).toBe('my_gmail');
		expect(service.list()[0]).toMatchObject({ name: 'My Gmail', status: 'configured', toolsCount: 1 });
		expect(await service.test(added.id)).toMatchObject({ status: 'configured' });
		const updated = await service.disable(added.id);
		expect(updated.enabled).toBe(false);
		expect(await service.test(added.id)).toMatchObject({ status: 'disabled' });
		await service.remove(added.id);
		expect(service.list()).toEqual([]);
		await expect(service.add({ name: 'Bad', connectorId: 'connector_gmail', authorization: 'x', allowedTools: ['missing'] })).rejects.toThrow(/not available/);
	});

	it('builds Google OAuth URLs with offline access and least required Gmail scopes', () => {
		const url = new URL(buildGoogleAuthorizationUrl({
			clientId: 'client-id',
			redirectUri: 'http://127.0.0.1:42818/oauth/google/callback',
			state: 'state',
			scopes: scopesForGmailTools(['search_emails', 'send_email']),
		}));

		expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
		expect(url.searchParams.get('access_type')).toBe('offline');
		expect(url.searchParams.get('include_granted_scopes')).toBe('true');
		expect(url.searchParams.get('prompt')).toBe('consent');
		expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/gmail.readonly');
		expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/gmail.send');
	});

	it('builds least required Google Calendar OAuth scopes for writable event tools', () => {
		const scopes = scopesForGoogleCalendarTools(['search_events', 'create_event']);

		expect(scopes).toContain('https://www.googleapis.com/auth/calendar.events.readonly');
		expect(scopes).toContain('https://www.googleapis.com/auth/calendar.events');
		expect(scopes).toContain('https://www.googleapis.com/auth/userinfo.email');
	});

	it('connects Gmail tools to Google OAuth tokens and exposes them to the agent', async () => {
		let connectors: unknown[] = [];
		const store = {
			getConnectors: jest.fn(() => connectors),
			setConnectors: jest.fn((next: unknown[]) => { connectors = next; }),
		};
		const fetchImpl = jest.fn(async (url: string, init?: RequestInit) => {
			if (url === 'https://oauth2.googleapis.com/token') {
				expect(String(init?.body)).toContain('grant_type=refresh_token');
				return jsonResponse({ access_token: 'fresh-token', expires_in: 3600, token_type: 'Bearer' });
			}
			if (url.startsWith('https://gmail.googleapis.com/gmail/v1/users/me/messages?')) {
				expect(init?.headers).toMatchObject({ authorization: 'Bearer fresh-token' });
				return jsonResponse({ messages: [{ id: 'msg-1', threadId: 'thread-1' }] });
			}
			if (url.includes('/messages/msg-1')) {
				return jsonResponse({
					id: 'msg-1',
					threadId: 'thread-1',
					snippet: 'Hello from Gmail',
					payload: {
						headers: [
							{ name: 'From', value: 'sender@example.com' },
							{ name: 'Subject', value: 'Hello' },
							{ name: 'Date', value: 'Today' },
						],
					},
				});
			}
			throw new Error(`unexpected fetch: ${url}`);
		}) as unknown as typeof fetch;
		const service = new ConnectorsService(store as never, makeLogger() as never, { fetchImpl });
		await service.add({
			name: 'My Gmail',
			connectorId: 'connector_gmail',
			oauthClientId: 'client-id',
			oauthClientSecret: 'client-secret',
			allowedTools: ['search_emails'],
			requireApproval: 'never_for_allowed_tools',
		});
		connectors = [
			{
				...(connectors[0] as Record<string, unknown>),
				oauth: {
					...((connectors[0] as { oauth: Record<string, unknown> }).oauth),
					refreshToken: 'refresh-token',
				},
			},
		];

		expect(service.list()[0]).toMatchObject({ status: 'configured', authKind: 'google_oauth' });
		const tools = service.createAgentTools();

		expect(tools.map((tool) => tool.name)).toEqual(['my_gmail_search_emails']);
		await expect(tools[0]!.execute({ query: 'from:sender@example.com' }, {} as never)).resolves.toMatchObject({
			status: 'ok',
			content: [expect.objectContaining({ text: expect.stringContaining('msg-1') })],
		});
	});

	it('executes Google Calendar read and write tools with Google OAuth tokens', async () => {
		let connectors: unknown[] = [];
		const store = {
			getConnectors: jest.fn(() => connectors),
			setConnectors: jest.fn((next: unknown[]) => { connectors = next; }),
		};
		const fetchImpl = jest.fn(async (url: string, init?: RequestInit) => {
			if (url === 'https://oauth2.googleapis.com/token') {
				expect(String(init?.body)).toContain('grant_type=refresh_token');
				return jsonResponse({ access_token: 'fresh-token', expires_in: 3600, token_type: 'Bearer' });
			}
			if (url.startsWith('https://www.googleapis.com/calendar/v3/calendars/primary/events?')) {
				expect(init?.headers).toMatchObject({ authorization: 'Bearer fresh-token' });
				return jsonResponse({
					items: [
						{
							id: 'event-1',
							summary: 'Planning',
							start: { dateTime: '2026-05-17T10:00:00Z' },
							end: { dateTime: '2026-05-17T11:00:00Z' },
						},
					],
				});
			}
			if (url === 'https://www.googleapis.com/calendar/v3/calendars/primary/events') {
				expect(init?.headers).toMatchObject({ authorization: 'Bearer fresh-token' });
				expect(JSON.parse(String(init?.body))).toMatchObject({ summary: 'Demo' });
				return jsonResponse({
					id: 'event-2',
					summary: 'Demo',
					start: { dateTime: '2026-05-18T10:00:00Z' },
					end: { dateTime: '2026-05-18T11:00:00Z' },
				});
			}
			throw new Error(`unexpected fetch: ${url}`);
		}) as unknown as typeof fetch;
		const service = new ConnectorsService(store as never, makeLogger() as never, { fetchImpl });
		const added = await service.add({
			name: 'My Calendar',
			connectorId: 'connector_googlecalendar',
			oauthClientId: 'client-id',
			oauthClientSecret: 'client-secret',
			allowedTools: ['search_events', 'create_event'],
			requireApproval: 'never_for_allowed_tools',
		});
		connectors = [
			{
				...(connectors[0] as Record<string, unknown>),
				oauth: {
					...((connectors[0] as { oauth: Record<string, unknown> }).oauth),
					refreshToken: 'refresh-token',
				},
			},
		];

		await expect(service.callTool(added.id, 'search_events', { query: 'planning' })).resolves.toMatchObject({
			items: [expect.objectContaining({ id: 'event-1', summary: 'Planning' })],
		});
		await expect(service.callTool(added.id, 'create_event', {
			summary: 'Demo',
			start: '2026-05-18T10:00:00Z',
			end: '2026-05-18T11:00:00Z',
		})).resolves.toMatchObject({ id: 'event-2', summary: 'Demo' });
	});
});

function jsonResponse(payload: unknown, status = 200): Response {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: async () => payload,
		text: async () => JSON.stringify(payload),
	} as Response;
}

describe('workspace service', () => {
	it('confines reads and writes to the configured root', async () => {
		const root = await makeTempDir();
		const service = new WorkspaceService(makeLogger() as never, { rootPath: root });
		await service.writeText('nested/file.txt', 'hello');
		await expect(service.readText('nested/file.txt')).resolves.toBe('hello');
		await service.writeJson('data.json', { ok: true });
		await expect(service.readJson('data.json')).resolves.toEqual({ ok: true });
		expect(() => service.resolvePath('..', 'outside')).toThrow(/outside root/);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('seeds canonical workspace files without overwriting user edits', async () => {
		const root = await makeTempDir();
		const service = new WorkspaceService(makeLogger() as never, { rootPath: root });

		await service.ensureReady({ initializeGit: false });
		await expect(fs.readFile(path.join(root, 'AGENTS.md'), 'utf8')).resolves.toContain(
			'Workspace Rules'
		);
		await expect(fs.readFile(path.join(root, 'BOOTSTRAP.md'), 'utf8')).resolves.toContain(
			'First Run'
		);

		await fs.writeFile(path.join(root, 'SOUL.md'), 'custom soul', 'utf8');
		await service.ensureReady({ initializeGit: false });
		await expect(fs.readFile(path.join(root, 'SOUL.md'), 'utf8')).resolves.toBe('custom soul');

		await fs.rm(path.join(root, 'BOOTSTRAP.md'));
		await service.ensureReady({ initializeGit: false });
		await expect(fs.access(path.join(root, 'BOOTSTRAP.md'))).rejects.toThrow();
		await expect(service.isBootstrapPending()).resolves.toBe(false);
		await fs.rm(root, { recursive: true, force: true });
	});

	it('loads only safe canonical workspace files', async () => {
		const root = await makeTempDir();
		const service = new WorkspaceService(makeLogger() as never, { rootPath: root });
		await service.ensureReady({ initializeGit: false });

		await fs.rm(path.join(root, 'USER.md'));
		await fs.symlink(path.join(root, 'AGENTS.md'), path.join(root, 'USER.md'));
		const loaded = await service.readWorkspaceFile('USER.md');

		expect(loaded).toMatchObject({ name: 'USER.md', missing: true, error: 'unsafe' });
		await expect(service.readWorkspaceFile('../outside')).rejects.toThrow(/Unsupported/);
		await fs.rm(root, { recursive: true, force: true });
	});
});

describe('logger service', () => {
	it('buffers recent logs and flushes to the current log file', async () => {
		const userData = await makeTempDir();
		(app.getPath as jest.Mock).mockImplementation((name: string) => path.join(userData, name));
		const logger = new LoggerService(null, {
			minLevel: LogLevel.DEBUG,
			consoleOutput: false,
			flushInterval: 60_000,
			maxBufferSize: 10,
		});
		logger.info('Test', 'hello', { value: 1 });
		expect(logger.getRecentLogs(1)[0]).toMatchObject({ source: 'Test', message: 'hello {"value":1}' });
		logger.flush();
		const file = logger.getCurrentLogFile();
		expect(file).toBeTruthy();
		await expect(fs.readFile(file!, 'utf8')).resolves.toContain('[Test] hello');
		logger.destroy();
		await fs.rm(userData, { recursive: true, force: true });
	});
});
