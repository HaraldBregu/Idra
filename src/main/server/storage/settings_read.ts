import fs from 'node:fs';
import path from 'node:path';
import { StorageError } from './error';
import type { SettingsResult, StoredSettings } from './types';

export function readSettings(dataDirectory: string): SettingsResult {
	const filePath = path.join(path.resolve(dataDirectory), 'settings.json');
	if (!fs.existsSync(filePath)) return { exists: false, settings: {} };
	if (fs.lstatSync(filePath).isSymbolicLink()) {
		throw new StorageError(400, 'The settings file cannot be a symbolic link.');
	}

	const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as unknown;
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new StorageError(500, 'The settings file must contain a JSON object.');
	}
	return { exists: true, settings: parsed as StoredSettings };
}
