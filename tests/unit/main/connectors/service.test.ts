jest.mock('electron-store', () => {
	return jest.fn().mockImplementation(() => {
		const data = new Map<string, unknown>();
		return {
			data,
			get: (key: string) => data.get(key),
			set: (key: string, value: unknown) => {
				data.set(key, value);
			},
			delete: (key: string) => {
				data.delete(key);
			},
		};
	});
});

import Store from 'electron-store';
import { ConnectorsService } from '../../../../src/main/connectors';
import type { ConnectorConfig } from '../../../../src/shared/connectors';
import { makeLogger } from '../test-helpers';

const MockStore = Store as jest.MockedClass<typeof Store>;

function createService() {
	const logger = makeLogger();
	const service = new ConnectorsService(logger as never);
	const store = MockStore.mock.results.at(-1)?.value as {
		data: Map<string, unknown>;
		get: jest.Mock;
		set: jest.Mock;
		delete: jest.Mock;
	};
	return { service, store, logger };
}

function gmailConnector(overrides: Partial<ConnectorConfig> = {}): ConnectorConfig {
	return {
		id: 'connector-1',
		name: 'Gmail',
		connectorId: 'connector_gmail',
		serverLabel: 'gmail',
		enabled: true,
		authorization: 'token',
		requireApproval: 'always',
		allowedTools: ['get_profile'],
		deferLoading: false,
		tools: [],
		createdAt: '2026-05-22T00:00:00.000Z',
		updatedAt: '2026-05-22T00:00:00.000Z',
		...overrides,
	};
}

describe('ConnectorsService persistence', () => {
	beforeEach(() => {
		MockStore.mockClear();
	});

	it('constructs a dedicated connectors Electron Store', () => {
		createService();

		expect(MockStore).toHaveBeenCalledWith({
			name: 'connectors',
			accessPropertiesByDotNotation: false,
		});
	});

	it('reads, writes, lists, updates, and deletes connector settings by connector key', async () => {
		const { service, store, logger } = createService();

		const added = await service.add({
			name: 'My Gmail',
			connectorId: 'connector_gmail',
			authorization: 'token',
			allowedTools: ['get_profile'],
		});

		expect(store.data.get('google_gmail')).toMatchObject({ authorization: 'token' });
		expect(added.authorization).toBe('');
		expect(service.getConnectorSettings()[0]).toMatchObject({
			name: 'My Gmail',
			authorization: '',
		});
		expect(service.list()).toEqual([
			expect.objectContaining({ name: 'My Gmail', status: 'configured' }),
		]);

		await service.update(added.id, { name: 'Work Gmail' });
		expect(store.data.get('google_gmail')).toMatchObject({ name: 'Work Gmail' });

		await service.remove(added.id);
		expect(store.data.get('google_gmail')).toBeUndefined();
		expect(service.list()).toEqual([]);
		expect(logger.debug).toHaveBeenCalledWith(
			'ConnectorsService',
			'Deleted connector settings',
			expect.objectContaining({ key: 'google_gmail' })
		);
	});

	it('drops invalid stored connector records and logs the normalization failure', () => {
		const { service, store, logger } = createService();
		store.data.set('google_gmail', { id: 'connector-1' });

		expect(service.list()).toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith(
			'ConnectorsService',
			'Dropped invalid connector settings',
			expect.objectContaining({ key: 'google_gmail' })
		);
	});

	it('validates settings before writing and logs validation failures', async () => {
		const { service, logger } = createService();

		await expect(
			service.add({
				name: 'Bad Gmail',
				connectorId: 'connector_gmail',
				allowedTools: ['missing'],
			})
		).rejects.toThrow(/not available/);
		expect(logger.warn).toHaveBeenCalledWith(
			'ConnectorsService',
			'Connector validation failed',
			expect.objectContaining({
				action: 'add',
				error: expect.stringContaining('not available'),
			})
		);
	});

	it('logs and rethrows connector read, write, and delete persistence errors', async () => {
		const { service, store, logger } = createService();

		store.get = jest.fn(() => {
			throw new Error('read failed');
		});
		expect(() => service.list()).toThrow('read failed');
		expect(logger.error).toHaveBeenCalledWith(
			'ConnectorsService',
			'Failed to read connector settings',
			expect.objectContaining({ key: 'google_gmail', error: 'read failed' })
		);

		const writeHarness = createService();
		writeHarness.store.set = jest.fn(() => {
			throw new Error('write failed');
		});
		await expect(
			writeHarness.service.add({
				name: 'My Gmail',
				connectorId: 'connector_gmail',
				authorization: 'token',
			})
		).rejects.toThrow('write failed');
		expect(writeHarness.logger.error).toHaveBeenCalledWith(
			'ConnectorsService',
			'Failed to write connector settings',
			expect.objectContaining({ key: 'google_gmail', error: 'write failed' })
		);

		const deleteHarness = createService();
		deleteHarness.store.data.set('google_gmail', gmailConnector());
		deleteHarness.store.delete = jest.fn(() => {
			throw new Error('delete failed');
		});
		await expect(deleteHarness.service.remove('connector-1')).rejects.toThrow('delete failed');
		expect(deleteHarness.logger.error).toHaveBeenCalledWith(
			'ConnectorsService',
			'Failed to delete connector settings',
			expect.objectContaining({ key: 'google_gmail', error: 'delete failed' })
		);
	});
});
