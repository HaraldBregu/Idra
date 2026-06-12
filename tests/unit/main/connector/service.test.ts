import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ConnectorSettingsService } from '../../../../src/main/services/connector-settings-service';

function createService(): ConnectorSettingsService {
	return new ConnectorSettingsService({
		cwd: mkdtempSync(path.join(tmpdir(), 'friday-connectors-')),
	});
}

function createServiceWithLocation(): { service: ConnectorSettingsService; cwd: string } {
	const cwd = mkdtempSync(path.join(tmpdir(), 'friday-connectors-'));
	return {
		service: new ConnectorSettingsService({ cwd }),
		cwd,
	};
}

describe('ConnectorSettingsService', () => {
	it('starts with no configured connectors', () => {
		const service = createService();

		expect(service.list()).toEqual({});
	});

	it('stores supported connector settings by connector id', () => {
		const service = createService();

		const result = service.upsert({
			id: 'gmail',
			name: 'Gmail',
			connectorId: 'connector_gmail',
			authorization: ' token ',
		});

		expect(Object.keys(service.list())).toEqual(['gmail']);
		expect(result.gmail).toEqual(
			expect.objectContaining({
				type: 'mcp',
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
			connectorId: 'connector_gmail',
		});

		expect(existsSync(path.join(cwd, 'setting.json'))).toBe(true);
	});

	it('resolves connector ids from catalog connector ids', () => {
		const service = createService();

		service.upsert({
			name: 'Calendar',
			connectorId: 'connector_calendar',
		});

		expect(service.get('calendar').calendar).toEqual(
			expect.objectContaining({
				server_label: 'calendar',
				server_url: 'https://www.googleapis.com/calendar/v3',
			})
		);
	});

	it('rejects unsupported connectors', () => {
		const service = createService();

		expect(() =>
			service.upsert({
				id: 'drive',
				name: 'Drive',
				connectorId: 'connector_drive',
			})
		).toThrow('Unsupported connector: drive');
	});
});
