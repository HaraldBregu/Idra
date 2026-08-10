const getWikiSettings = jest.fn();
const getWikiStatus = jest.fn();
const runWiki = jest.fn();
const cancelWiki = jest.fn();
const saveWikiSettings = jest.fn();

jest.mock('../../../../src/main/agent/knowledge/wiki', () => ({
	getWikiSettings,
	getWikiStatus,
	runWiki,
	cancelWiki,
	saveWikiSettings,
}));

jest.mock('../../../../src/main/ipc/core/gateway', () => ({
	registerQuery: jest.fn(),
	registerCommand: jest.fn(),
}));

import type { EventBus } from '../../../../src/main/event_bus';
import { registerCommand, registerQuery } from '../../../../src/main/ipc/core/gateway';
import { WikiIpc } from '../../../../src/main/ipc/wiki';
import { WikiChannels } from '../../../../src/shared/ipc_channels_definitions';

describe('WikiIpc', () => {
	it('registers a separate typed wiki API', async () => {
		new WikiIpc().register(undefined, {} as EventBus);

		expect(registerQuery).toHaveBeenCalledWith(WikiChannels.getSettings, expect.any(Function));
		expect(registerQuery).toHaveBeenCalledWith(WikiChannels.getStatus, expect.any(Function));
		expect(registerCommand).toHaveBeenCalledWith(WikiChannels.saveSettings, expect.any(Function));
		expect(registerCommand).toHaveBeenCalledWith(WikiChannels.run, expect.any(Function));
		expect(registerCommand).toHaveBeenCalledWith(WikiChannels.cancel, expect.any(Function));
		expect(registerCommand).toHaveBeenCalledWith(WikiChannels.pickDirectory, expect.any(Function));
		expect(registerCommand).toHaveBeenCalledWith(WikiChannels.openDirectory, expect.any(Function));

		const settingsHandler = (registerQuery as jest.Mock).mock.calls.find(
			([channel]) => channel === WikiChannels.getSettings
		)?.[1];
		settingsHandler();
		expect(getWikiSettings).toHaveBeenCalled();

		const runHandler = (registerCommand as jest.Mock).mock.calls.find(
			([channel]) => channel === WikiChannels.run
		)?.[1];
		await runHandler();
		expect(runWiki).toHaveBeenCalled();

		const cancelHandler = (registerCommand as jest.Mock).mock.calls.find(
			([channel]) => channel === WikiChannels.cancel
		)?.[1];
		cancelHandler();
		expect(cancelWiki).toHaveBeenCalled();
	});
});
