jest.mock('../../../../src/main/channels/channels_store', () => ({
	getChannelConfig: jest.fn(() => ({ enabled: true, token: 'tok', allowFrom: [] })),
	getModelId: jest.fn(() => undefined),
	getProviderId: jest.fn(() => undefined),
}));

import { createChannelRegistry } from '../../../../src/main/channels/channels_registry';
import type { EventBus } from '../../../../src/main/event_bus';
import type { LoggerService } from '../../../../src/main/shared';

function deps() {
	return {
		logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as LoggerService,
		eventBus: { emit: jest.fn(), broadcast: jest.fn() } as unknown as EventBus,
	};
}

describe('createChannelRegistry', () => {
	it('returns undefined status before any channel starts', () => {
		const registry = createChannelRegistry(deps());
		expect(registry.getStatus()).toBeUndefined();
		expect(registry.getStatus('discord')).toBeUndefined();
	});

	it('throws when sending on a channel that is not running', async () => {
		const registry = createChannelRegistry(deps());
		await expect(
			registry.send({ channel: 'telegram', to: 'c1', content: { type: 'text', text: 'hi' } })
		).rejects.toThrow(/telegram channel is not running/);
	});
});
