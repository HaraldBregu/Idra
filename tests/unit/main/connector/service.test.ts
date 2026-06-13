import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Connector } from '../../../../src/main/connectors';

function createService(): Connector {
	return new Connector({
		cwd: mkdtempSync(path.join(tmpdir(), 'friday-connectors-')),
	});
}

function createServiceWithLocation(): { service: Connector; cwd: string } {
	const cwd = mkdtempSync(path.join(tmpdir(), 'friday-connectors-'));
	return {
		service: new Connector({ cwd }),
		cwd,
	};
}

describe('Connector', () => {
	it('starts with no configured connectors', () => {
		const service = createService();

		expect(service.list()).toEqual({});
	});

	it('stores supported connector settings by connector id', () => {
		const service = createService();

		const result = service.upsert({
			id: 'gmail',
			name: 'Gmail',
			authorization: ' token ',
		});

		expect(Object.keys(service.list())).toEqual(['gmail']);
		expect(result.gmail).toEqual(
			expect.objectContaining({
				type: 'mcp',
				connector_id: 'connector_gmail',
				server_label: 'gmail',
				server_url: 'https://gmailmcp.googleapis.com/mcp/v1',
				authorization: 'token',
				enabled: true,
			})
		);
		expect(result.gmail?.created_at).toBeDefined();
		expect(result.gmail?.updated_at).toBeDefined();
	});

	it('writes settings to setting.json in the connector settings directory', () => {
		const { service, cwd } = createServiceWithLocation();

		service.upsert({
			id: 'gmail',
			name: 'Gmail',
		});

		const settingsPath = path.join(cwd, 'setting.json');
		const stored = JSON.parse(readFileSync(settingsPath, 'utf8'));

		expect(existsSync(settingsPath)).toBe(true);
		expect(stored).not.toHaveProperty('connectors');
		expect(stored).toEqual(
			expect.objectContaining({
				gmail: expect.objectContaining({
					type: 'mcp',
					connector_id: 'connector_gmail',
					server_label: 'gmail',
				}),
			})
		);
	});

	it('does not resolve provider connector ids as connector ids', () => {
		const service = createService();

		expect(() =>
			service.upsert({
				name: 'Calendar',
				connectorId: 'connector_googlecalendar',
			})
		).toThrow('Unsupported connector:');
	});

	it('backfills provider connector ids for stored connector records', () => {
		const service = createService();

		service.save({
			calendar: {
				type: 'mcp',
				server_label: 'calendar',
				server_url: 'https://www.googleapis.com/calendar/v3',
				enabled: true,
			},
		});

		expect(service.mcp()).toEqual([
			expect.objectContaining({
				serverLabel: 'calendar',
				connectorId: 'connector_googlecalendar',
			}),
		]);
	});

	it('rejects unsupported connectors', () => {
		const service = createService();

		expect(() =>
			service.upsert({
				id: 'drive',
				name: 'Drive',
			})
		).toThrow('Unsupported connector: drive');
	});

	it('requires a configured OAuth client id before authorizing', async () => {
		const service = createService();
		const originalValue = process.env.TEST_CONNECTOR_CLIENT_ID;
		delete process.env.TEST_CONNECTOR_CLIENT_ID;

		try {
			await expect(
				service.authorizeOAuth({
					service: 'test',
					clientIdEnv: 'TEST_CONNECTOR_CLIENT_ID',
					authorizationUrl: 'https://example.com/oauth/authorize',
					tokenUrl: 'https://example.com/oauth/token',
					scopes: ['profile'],
				})
			).rejects.toThrow('Missing OAuth client id: TEST_CONNECTOR_CLIENT_ID');
		} finally {
			if (originalValue === undefined) {
				delete process.env.TEST_CONNECTOR_CLIENT_ID;
			} else {
				process.env.TEST_CONNECTOR_CLIENT_ID = originalValue;
			}
		}
	});
});
