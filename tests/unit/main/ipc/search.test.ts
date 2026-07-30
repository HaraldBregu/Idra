const getSearchSettings = jest.fn();
const saveSearchEngine = jest.fn();
const selectSearchEngine = jest.fn();

jest.mock('../../../../src/main/app/search', () => ({
	getSearchSettings,
	saveSearchEngine,
	selectSearchEngine,
}));

jest.mock('../../../../src/main/ipc/core/gateway', () => ({
	registerQuery: jest.fn(),
	registerCommand: jest.fn(),
}));

import type { EventBus } from '../../../../src/main/app/event_bus';
import { registerCommand, registerQuery } from '../../../../src/main/ipc/core/gateway';
import { SearchIpc } from '../../../../src/main/ipc/search';
import { SearchChannels } from '../../../../src/shared/ipc_channels_definitions';

describe('SearchIpc', () => {
	it('registers the typed search settings handlers', () => {
		new SearchIpc().register(undefined, {} as EventBus);

		expect(registerQuery).toHaveBeenCalledWith(SearchChannels.getSettings, getSearchSettings);
		expect(registerCommand).toHaveBeenCalledWith(SearchChannels.saveEngine, saveSearchEngine);
		expect(registerCommand).toHaveBeenCalledWith(SearchChannels.selectEngine, selectSearchEngine);
	});
});
