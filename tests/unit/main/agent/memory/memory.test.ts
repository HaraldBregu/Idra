import fs from 'node:fs/promises';

jest.mock('node:fs/promises', () => ({
	readFile: jest.fn(),
	writeFile: jest.fn(),
}));
jest.mock('../../../../../src/main/agent/memory/memory_path', () => ({
	memoryPath: jest.fn(() => '/mem/MEMORY.md'),
}));

import { saveMemory } from '../../../../../src/main/agent/memory/memory_save';
import { forgetMemory } from '../../../../../src/main/agent/memory/memory_forget';
import type { Config } from '../../../../../src/main/agent/types';

const readFile = fs.readFile as jest.Mock;
const writeFile = fs.writeFile as jest.Mock;
const config = {} as Config;

beforeEach(() => {
	readFile.mockReset();
	writeFile.mockReset().mockResolvedValue(undefined);
});

describe('saveMemory', () => {
	it('appends a new fact', async () => {
		readFile.mockResolvedValue('- existing\n');
		const result = await saveMemory(config, 'a new fact');
		expect(result).toEqual({ saved: true });
		expect(writeFile).toHaveBeenCalledWith('/mem/MEMORY.md', '- existing\n- a new fact\n', 'utf8');
	});
	it('adds a newline separator when the file does not end with one', async () => {
		readFile.mockResolvedValue('- existing');
		await saveMemory(config, 'x');
		expect(writeFile).toHaveBeenCalledWith('/mem/MEMORY.md', '- existing\n- x\n', 'utf8');
	});
	it('does not duplicate an existing fact', async () => {
		readFile.mockResolvedValue('- dup\n');
		const result = await saveMemory(config, 'dup');
		expect(result).toEqual({ saved: false });
		expect(writeFile).not.toHaveBeenCalled();
	});
});

describe('forgetMemory', () => {
	it('removes matching lines and reports the count', async () => {
		readFile.mockResolvedValue('- keep this\n- drop the target\n- target again drop');
		const result = await forgetMemory(config, 'target');
		expect(result).toEqual({ removed: 2 });
		expect(writeFile).toHaveBeenCalledWith('/mem/MEMORY.md', '- keep this', 'utf8');
	});
	it('is case-insensitive', async () => {
		readFile.mockResolvedValue('- Contains TARGET word');
		expect(await forgetMemory(config, 'target')).toEqual({ removed: 1 });
	});
	it('returns 0 for a blank query without writing', async () => {
		readFile.mockResolvedValue('- anything');
		expect(await forgetMemory(config, '   ')).toEqual({ removed: 0 });
		expect(writeFile).not.toHaveBeenCalled();
	});
	it('does not write when nothing matches', async () => {
		readFile.mockResolvedValue('- keep\n- keep two');
		expect(await forgetMemory(config, 'zzz')).toEqual({ removed: 0 });
		expect(writeFile).not.toHaveBeenCalled();
	});
});
