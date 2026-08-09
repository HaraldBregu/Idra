const saveMemory = jest.fn();
const forgetMemory = jest.fn();
const listMemories = jest.fn();

jest.mock('../../../../../src/main/agent/memory', () => ({
	MAX_MEMORY_FACT_LENGTH: 500,
	memoryPath: jest.fn(() => '/workspace/MEMORY.md'),
	saveMemory,
	forgetMemory,
	listMemories,
}));

import { forgetMemoryTool } from '../../../../../src/main/agent/tools/memory/forget';
import { memoryListTool } from '../../../../../src/main/agent/tools/memory/list';
import { saveMemoryTool } from '../../../../../src/main/agent/tools/memory/save';
import type { Config } from '../../../../../src/main/agent/types';

const config = { location: '/workspace' } as Config;

it.each([
	['save', saveMemoryTool(config)],
	['delete', forgetMemoryTool(config)],
])('marks memory %s as a hard-approved main-only persistence action', (_label, memoryTool) => {
	expect(memoryTool).toMatchObject({
		defaultPermission: 'allow',
		alwaysAsk: true,
		hardApproval: true,
		stopOnReject: true,
		risk: 'high',
		effect: 'persistence',
		allowedOrigins: ['main'],
	});
	expect(memoryTool.targets?.({})).toEqual(['/workspace/MEMORY.md']);
});

it('requires an exact ID for deletion', () => {
	const memoryTool = forgetMemoryTool(config);
	expect(() => memoryTool.parseInput({ id: 'target' })).toThrow();
	expect(memoryTool.parseInput({ id: 'memory-0123456789abcdef' })).toEqual({
		id: 'memory-0123456789abcdef',
	});
});

it('defines a main-only memory_list read tool', async () => {
	listMemories.mockResolvedValue([{ id: 'memory-0123456789abcdef', fact: 'fact' }]);
	const memoryTool = memoryListTool(config);

	expect(memoryTool).toMatchObject({
		name: 'memory_list',
		defaultPermission: 'allow',
		risk: 'medium',
		effect: 'read',
		allowedOrigins: ['main'],
	});
	await expect(memoryTool.run(memoryTool.parseInput({}))).resolves.toEqual({
		memories: [{ id: 'memory-0123456789abcdef', fact: 'fact' }],
	});
});
