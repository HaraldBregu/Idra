const listExtensions = jest.fn(() => []);
const loadExtension = jest.fn();
const importExtensions = jest.fn();
const openRoot = jest.fn();
const deleteExtension = jest.fn();

jest.mock('../../../../src/main/extensions/extension_index', () => ({
	listExtensions,
	loadExtension,
	importExtensions,
	openRoot,
	deleteExtension,
}));
jest.mock('../../../../src/main/ipc/core/gateway', () => ({
	registerQuery: jest.fn(),
	registerCommand: jest.fn(),
	registerCommandWithEvent: jest.fn(),
}));

import type { EventBus } from '../../../../src/main/event_bus';
import { ExtensionsIpc } from '../../../../src/main/ipc/extensions';
import { registerCommand } from '../../../../src/main/ipc/core/gateway';
import type { WindowFactory } from '../../../../src/main/window_factory';
import { ExtensionChannels } from '../../../../src/shared/ipc_channels_definitions';

it('opens the extensions directory in the system file explorer', async () => {
	new ExtensionsIpc().register({ windowFactory: {} as WindowFactory }, {} as EventBus);

	const handler = (registerCommand as jest.Mock).mock.calls.find(
		([channel]) => channel === ExtensionChannels.openRoot
	)?.[1];
	await handler();

	expect(openRoot).toHaveBeenCalledTimes(1);

	const deleteHandler = (registerCommand as jest.Mock).mock.calls.find(
		([channel]) => channel === ExtensionChannels.delete
	)?.[1];
	await deleteHandler('demo-extension');

	expect(deleteExtension).toHaveBeenCalledWith('demo-extension');
});
