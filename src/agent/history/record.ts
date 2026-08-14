import crypto from 'node:crypto';
import type { FileHistory, FileSnapshot } from './types';

export function recordFileOperation(
	history: FileHistory,
	runId: string,
	toolCallId: string,
	toolName: string,
	before: FileSnapshot[],
	after: FileSnapshot[]
): void {
	history.operations = history.operations.filter((operation) => operation.state !== 'undone');
	history.operations.push({
		id: crypto.randomUUID(),
		runId,
		toolCallId,
		toolName,
		createdAt: new Date().toISOString(),
		before,
		after,
		state: 'applied',
	});
	history.operations = history.operations.slice(-100);
}
