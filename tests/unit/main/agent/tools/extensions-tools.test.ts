const listExtensions = jest.fn();
const loadExtension = jest.fn();

jest.mock('../../../../../src/main/extensions/extension_index', () => ({
	listExtensions,
	loadExtension,
}));

import { listExtensionsTool } from '../../../../../src/main/agent/tools/extensions/list';
import { openExtensionsTool } from '../../../../../src/main/agent/tools/extensions/open';
import type { WindowFactory } from '../../../../../src/main/window_factory';
import type { Extension } from '../../../../../src/shared/extension_types';

const project: Extension = {
	id: 'project',
	title: 'Project',
	description: 'Project board',
	metadata: { version: '1.0.0', category: 'productivity', entry: 'index.html' },
};
const weather: Extension = {
	id: 'weather',
	title: 'Weather',
	description: 'Weather dashboard',
	metadata: { version: '1.0.0', category: 'utility', entry: 'index.html' },
};
const windowFactory = {} as WindowFactory;

beforeEach(() => {
	jest.clearAllMocks();
	listExtensions.mockReturnValue([project, weather]);
});

it('lists the installed extensions through a main-only read tool', async () => {
	await expect(listExtensionsTool.run({})).resolves.toEqual({ extensions: [project, weather] });
	expect(listExtensionsTool).toMatchObject({
		name: 'list_extensions',
		defaultPermission: 'allow',
		risk: 'low',
		effect: 'read',
		allowedOrigins: ['main'],
	});
});

it.each([
	['one extension', 'project', [project]],
	['multiple extensions', ['project', 'weather'], [project, weather]],
] as const)('opens %s by exact ID', async (_label, ids, expected) => {
	const extensionTool = openExtensionsTool(windowFactory);

	await expect(extensionTool.run({ ids })).resolves.toEqual({
		opened: expected.map((extension) => extension.id),
	});
	expect(loadExtension.mock.calls).toEqual(
		expected.map((extension) => [windowFactory, extension])
	);
});

it('rejects missing IDs before opening any extension', async () => {
	const extensionTool = openExtensionsTool(windowFactory);

	await expect(extensionTool.run({ ids: ['project', 'missing'] })).rejects.toThrow(
		'Extensions not found: missing'
	);
	expect(loadExtension).not.toHaveBeenCalled();
});

it('defines opening extensions as a main-only approval-gated action', () => {
	expect(openExtensionsTool(windowFactory)).toMatchObject({
		name: 'open_extensions',
		defaultPermission: 'ask',
		risk: 'medium',
		effect: 'execute',
		allowedOrigins: ['main'],
	});
});
