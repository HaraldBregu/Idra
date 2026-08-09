import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveUserPath } from '../../../../../src/main/shared/user_path';
import {
	toolPathDir,
	isPathWithin,
} from '../../../../../src/main/agent/permissions/permissions_path';

const agentDir = path.resolve('/appdata/agent');

describe('resolveUserPath', () => {
	it('expands a bare tilde to the home directory', () => {
		expect(resolveUserPath('~', agentDir)).toBe(os.homedir());
	});
	it('expands ~/ prefixes', () => {
		expect(resolveUserPath('~/docs', agentDir)).toBe(path.resolve(os.homedir(), 'docs'));
	});
	it('resolves relative paths from the agent directory', () => {
		expect(resolveUserPath('foo/bar', agentDir)).toBe(path.resolve(agentDir, 'foo/bar'));
	});
});

describe('toolPathDir', () => {
	it('returns the parent dir of a path arg', () => {
		expect(toolPathDir({ path: '/a/b/c.txt' }, agentDir)).toBe(
			path.dirname(path.resolve('/a/b/c.txt'))
		);
	});
	it('falls back to workdir', () => {
		expect(toolPathDir({ workdir: '/a/b' }, agentDir)).toBe(path.resolve('/a/b'));
	});
	it('returns undefined when neither is present', () => {
		expect(toolPathDir({}, agentDir)).toBeUndefined();
		expect(toolPathDir({ path: '' }, agentDir)).toBeUndefined();
	});
	it('uses the destination directory of a symlinked file', () => {
		const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'friday-permission-path-'));
		try {
			const inside = path.join(tempDir, 'agent');
			const outside = path.join(tempDir, 'outside');
			const outsideFile = path.join(outside, 'secret.txt');
			const link = path.join(inside, 'secret.txt');
			fs.mkdirSync(inside);
			fs.mkdirSync(outside);
			fs.writeFileSync(outsideFile, 'secret');
			fs.symlinkSync(outsideFile, link);

			expect(toolPathDir({ path: link }, inside)).toBe(fs.realpathSync(outside));
		} finally {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});
});

describe('isPathWithin', () => {
	it('is true for equal paths and descendants', () => {
		expect(isPathWithin('/a', '/a')).toBe(true);
		expect(isPathWithin('/a', '/a/b/c')).toBe(true);
	});
	it('is false for siblings and ancestors', () => {
		expect(isPathWithin('/a/b', '/a')).toBe(false);
		expect(isPathWithin('/a', '/b')).toBe(false);
	});
});
