import path from 'node:path';
import { PathValidator } from '../path-validator';
import { MAX_NAME_LENGTH, WINDOWS_RESERVED_NAME } from './constants';

/**
 * Resolve `inputPath` to an absolute path and verify it falls inside one of
 * the allowed root directories.
 *
 * Checked in order:
 *   1. The four standard Electron paths via {@link PathValidator}.
 *   2. The caller-supplied extra roots.
 *
 * @param inputPath  - The raw path to validate.
 * @param extraRoots - Resolved absolute roots accepted in addition to the PathValidator set.
 * @returns The resolved, normalised absolute path.
 * @throws {Error} If the path is not within any allowed root.
 */
export function assertPathSafe(inputPath: string, extraRoots: readonly string[]): string {
	if (typeof inputPath !== 'string' || inputPath.trim().length === 0) {
		throw new Error('FileManager: path must be a non-empty string');
	}

	const resolved = path.normalize(path.resolve(inputPath));

	if (PathValidator.isPathSafe(resolved)) {
		return resolved;
	}

	// Use a trailing separator to prevent one root prefix matching a sibling path.
	for (const root of extraRoots) {
		if (resolved === root || resolved.startsWith(root + path.sep)) {
			return resolved;
		}
	}

	throw new Error(
		`FileManager: path "${resolved}" is outside the allowed directories. ` +
			`Allowed roots: [${[...PathValidator.getAllowedPaths(), ...extraRoots].join(', ')}]`
	);
}

/**
 * Validate that a bare filename or folder name is safe for the target
 * filesystem. Rejects null bytes, path separators, names that are just
 * dots, Windows reserved device names, and overlong names.
 */
export function assertValidName(name: string): void {
	if (!name || name.trim().length === 0) {
		throw new Error('FileManager: file/folder name must not be empty');
	}
	if (name.length > MAX_NAME_LENGTH) {
		throw new Error(
			`FileManager: name "${name}" exceeds the maximum length of ${MAX_NAME_LENGTH} characters`
		);
	}
	if (name.includes('\0')) {
		throw new Error('FileManager: file/folder name must not contain null bytes');
	}
	if (name.includes('/') || name.includes('\\')) {
		throw new Error('FileManager: file/folder name must not contain path separators');
	}
	if (/^\.+$/.test(name)) {
		throw new Error('FileManager: file/folder name must not be "." or ".."');
	}
	if (WINDOWS_RESERVED_NAME.test(name)) {
		throw new Error(`FileManager: "${name}" is a reserved filesystem name on Windows`);
	}
}

/** Reject encoding values that are not in the allowed set. */
export function assertValidEncoding(encoding: string): void {
	const allowed: readonly string[] = ['utf-8', 'utf8', 'ascii', 'latin1'];
	if (!allowed.includes(encoding)) {
		throw new Error(
			`FileManager: unsupported encoding "${encoding}". ` + `Allowed values: ${allowed.join(', ')}`
		);
	}
}
