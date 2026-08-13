import crypto from 'node:crypto';
import { loadFileHistory } from './load';
import { saveFileHistory } from './save';
import type { FileSnapshot } from './types';

export function recordFileOperation(
	runId: string,
	toolCallId: string,
	toolName: string,
	before: FileSnapshot[],
	after: FileSnapshot[]
): void {
	const history = loadFileHistory();
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
	saveFileHistory(history);
}
