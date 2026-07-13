import os from 'node:os';
import path from 'node:path';
import {
	resolveUserPath,
	toolPathDir,
	isPathWithin,
} from '../../../../../src/main/agent/policy/policy_path';

describe('resolveUserPath', () => {
	it('expands a bare tilde to the home directory', () => {
		expect(resolveUserPath('~')).toBe(os.homedir());
	});
	it('expands ~/ prefixes', () => {
		expect(resolveUserPath('~/docs')).toBe(path.resolve(os.homedir(), 'docs'));
	});
	it('resolves ordinary paths absolutely', () => {
		expect(resolveUserPath('foo/bar')).toBe(path.resolve('foo/bar'));
	});
});

describe('toolPathDir', () => {
	it('returns the parent dir of a path arg', () => {
		expect(toolPathDir({ path: '/a/b/c.txt' })).toBe(path.dirname(path.resolve('/a/b/c.txt')));
	});
	it('falls back to workdir', () => {
		expect(toolPathDir({ workdir: '/a/b' })).toBe(path.resolve('/a/b'));
	});
	it('returns undefined when neither is present', () => {
		expect(toolPathDir({})).toBeUndefined();
		expect(toolPathDir({ path: '' })).toBeUndefined();
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
