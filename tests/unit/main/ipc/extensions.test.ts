const mkdir = jest.fn();
const listExtensions = jest.fn(() => []);
const loadExtension = jest.fn();
const importExtensions = jest.fn();

jest.mock('node:fs/promises', () => ({ mkdir }));
jest.mock('../../../../src/main/extensions/extension_index', () => ({
	listExtensions,
	loadExtension,
	importExtensions,
}));
jest.mock('../../../../src/main/extensions/extension_root', () => ({
	extensionsRoot: jest.fn(() => '/extensions'),
}));
jest.mock('../../../../src/main/ipc/core/gateway', () => ({
	registerQuery: jest.fn(),
	registerCommand: jest.fn(),
	registerCommandWithEvent: jest.fn(),
}));

import { shell } from 'electron';
import type { EventBus } from '../../../../src/main/event_bus';
import { ExtensionsIpc } from '../../../../src/main/ipc/extensions';
import { registerCommand } from '../../../../src/main/ipc/core/gateway';
import type { WindowFactory } from '../../../../src/main/window_factory';
import { ExtensionChannels } from '../../../../src/shared/ipc_channels_definitions';

it('opens the extensions directory in the system file explorer', async () => {
	new ExtensionsIpc().register({ windowFactory: {} as WindowFactory }, {} as EventBus);

	const handler = (registerCommand as jest.Mock).mock.calls.find(
		([channel]) => channel === ExtensionChannels.openFolder
	)?.[1];
	await handler();

	expect(mkdir).toHaveBeenCalledWith('/extensions', { recursive: true });
	expect(shell.openPath).toHaveBeenCalledWith('/extensions');
});
