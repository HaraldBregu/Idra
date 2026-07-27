import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { realPath } from '../../../../../src/main/shared/real_path';
import {
	fileToolState,
	hasCreatedFile,
	hasToolPermission,
	rememberTool,
} from '../../../../../src/main/agent/context';
import type { ToolsContext } from '../../../../../src/main/agent/context';

describe('tool context state', () => {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-context-'));

	it('stores the tool name, file name, and canonical path', () => {
		const context: ToolsContext = {};
		const state = fileToolState('write', { path: 'directory/example.txt' }, root);

		expect(state).toEqual({
			toolName: 'write',
			fileName: 'example.txt',
			path: realPath(path.join(root, 'directory', 'example.txt')),
			folderPath: realPath(path.join(root, 'directory')),
		});
		rememberTool(context, state!);
		expect(hasCreatedFile(context, state!.path)).toBe(true);
	});

	it('matches the full path rather than only the file name', () => {
		const context: ToolsContext = {};
		const created = fileToolState('write', { path: 'one/example.txt' }, root)!;
		const other = fileToolState('edit', { path: 'two/example.txt' }, root)!;
		rememberTool(context, created);

		expect(hasCreatedFile(context, other.path)).toBe(false);
	});

	it('stores and matches an allowed tool folder exactly', () => {
		const context: ToolsContext = {};
		const state = fileToolState('read', { path: 'readable/example.txt' }, root)!;
		rememberTool(context, state);

		expect(context.tools).toEqual([state]);
		expect(hasToolPermission(context, 'read', state.folderPath)).toBe(true);
		expect(hasToolPermission(context, 'edit', state.folderPath)).toBe(false);
		expect(hasToolPermission(context, 'read', path.join(state.folderPath, 'nested'))).toBe(false);
	});
});
