import fs from 'node:fs/promises';

jest.mock('node:fs/promises', () => ({
	readFile: jest.fn(),
	writeFile: jest.fn(),
	rename: jest.fn(),
	rm: jest.fn(),
}));
jest.mock('../../../../../src/main/agent/memory/memory_path', () => ({
	memoryPath: jest.fn(() => '/mem/MEMORY.md'),
}));

import { forgetMemory } from '../../../../../src/main/agent/memory/memory_forget';
import { listMemories } from '../../../../../src/main/agent/memory/memory_list';
import { saveMemory } from '../../../../../src/main/agent/memory/memory_save';
import { MAX_MEMORY_FACT_LENGTH } from '../../../../../src/main/agent/memory/memory_types';
import type { Config } from '../../../../../src/main/agent/types';

const readFile = fs.readFile as jest.Mock;
const writeFile = fs.writeFile as jest.Mock;
const rename = fs.rename as jest.Mock;
const rm = fs.rm as jest.Mock;
const config = {} as Config;

beforeEach(() => {
	readFile.mockReset();
	writeFile.mockReset().mockResolvedValue(undefined);
	rename.mockReset().mockResolvedValue(undefined);
	rm.mockReset().mockResolvedValue(undefined);
});

describe('saveMemory', () => {
	it('normalizes one line and appends a stable ID', async () => {
		readFile.mockResolvedValue('# Memory\n');
		const result = await saveMemory(config, '  prefers\n  concise\tanswers  ');

		expect(result).toMatchObject({
			saved: true,
			memory: { id: expect.stringMatching(/^memory-[a-f0-9]{16}$/), fact: 'prefers concise answers' },
		});
		expect(writeFile).toHaveBeenCalledWith(
			expect.stringMatching(/^\/mem\/\.MEMORY\.md\..+\.tmp$/),
			`# Memory\n- [${result.memory.id}] prefers concise answers\n`,
			expect.objectContaining({ encoding: 'utf8', flag: 'wx' })
		);
		expect(rename).toHaveBeenCalledWith(expect.any(String), '/mem/MEMORY.md');
	});

	it('deduplicates a legacy fact by its derived stable ID', async () => {
		readFile.mockResolvedValue('- prefers concise answers\n');
		expect(await saveMemory(config, 'prefers   concise answers')).toMatchObject({ saved: false });
		expect(writeFile).not.toHaveBeenCalled();
	});

	it('rejects oversized facts and likely secrets', async () => {
		readFile.mockResolvedValue('');
		await expect(saveMemory(config, 'x'.repeat(MAX_MEMORY_FACT_LENGTH + 1))).rejects.toThrow(
			'characters or fewer'
		);
		await expect(
			saveMemory(config, 'api_key=abcdefghijklmnopqrstuvwxyz123456')
		).rejects.toThrow('credential-like content');
		expect(writeFile).not.toHaveBeenCalled();
	});
});

describe('listMemories', () => {
	it('lists structured and legacy facts with stable IDs', async () => {
		readFile.mockResolvedValue('- legacy fact\n- [memory-0000000000000000] structured fact\n');
		const memories = await listMemories(config);

		expect(memories).toEqual([
			{ id: expect.stringMatching(/^memory-[a-f0-9]{16}$/), fact: 'legacy fact' },
			{ id: expect.stringMatching(/^memory-[a-f0-9]{16}$/), fact: 'structured fact' },
		]);
		expect(memories[1].id).not.toBe('memory-0000000000000000');
	});
});

describe('forgetMemory', () => {
	it('deletes only the exact stable ID and preserves overlapping facts', async () => {
		readFile.mockResolvedValue('- target\n- target details\n');
		const [target, detail] = await listMemories(config);
		readFile.mockResolvedValue('- target\n- target details\n');

		expect(await forgetMemory(config, target.id)).toEqual({ removed: true, id: target.id });
		expect(writeFile).toHaveBeenCalledWith(
			expect.stringMatching(/^\/mem\/\.MEMORY\.md\..+\.tmp$/),
			'- target details\n',
			expect.objectContaining({ encoding: 'utf8', flag: 'wx' })
		);
		expect(rename).toHaveBeenCalledWith(expect.any(String), '/mem/MEMORY.md');
		expect(detail.id).not.toBe(target.id);
	});

	it('does not write for a missing ID and rejects malformed IDs', async () => {
		readFile.mockResolvedValue('- existing\n');
		expect(await forgetMemory(config, 'memory-0000000000000000')).toEqual({
			removed: false,
			id: 'memory-0000000000000000',
		});
		await expect(forgetMemory(config, 'existing')).rejects.toThrow('valid memory ID');
		expect(writeFile).not.toHaveBeenCalled();
	});
});
