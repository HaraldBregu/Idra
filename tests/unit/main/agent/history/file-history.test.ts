import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-history-'));

jest.mock('../../../../../src/main/shared/user_data_location', () => ({
	userDataLocation: () => root,
}));

import { captureFiles } from '../../../../../src/main/agent/history/capture';
import { recordFileOperation } from '../../../../../src/main/agent/history/record';
import { redoFileOperation } from '../../../../../src/main/agent/history/redo';
import { undoFileOperation } from '../../../../../src/main/agent/history/undo';

afterEach(() => fs.rmSync(path.join(root, 'history'), { recursive: true, force: true }));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

it('undoes and redoes a file creation', () => {
	const target = path.join(root, 'created.txt');
	const before = captureFiles([target]);
	fs.writeFileSync(target, 'created');
	recordFileOperation('run', 'call', 'write_file', before, captureFiles([target]));

	undoFileOperation();
	expect(fs.existsSync(target)).toBe(false);
	redoFileOperation();
	expect(fs.readFileSync(target, 'utf8')).toBe('created');
});

it('restores deleted content and refuses to overwrite divergent changes', () => {
	const target = path.join(root, 'deleted.txt');
	fs.writeFileSync(target, 'original');
	const before = captureFiles([target]);
	fs.rmSync(target);
	recordFileOperation('run', 'call', 'apply_patch', before, captureFiles([target]));

	undoFileOperation();
	expect(fs.readFileSync(target, 'utf8')).toBe('original');
	fs.writeFileSync(target, 'newer');
	expect(() => redoFileOperation()).toThrow('Files changed');
});
