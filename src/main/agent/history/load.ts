import fs from 'node:fs';
import { fileHistoryLocation } from './location';
import type { FileHistory } from './types';

export function loadFileHistory(): FileHistory {
	try {
		const parsed = JSON.parse(fs.readFileSync(fileHistoryLocation(), 'utf8')) as FileHistory;
		return Array.isArray(parsed.operations) ? parsed : { operations: [] };
	} catch {
		return { operations: [] };
	}
}
