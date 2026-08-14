import { restoreFiles } from './restore';
import type { FileHistory, FileOperation } from './types';

export function redoFileOperation(history: FileHistory): FileOperation {
	const operation = history.operations.find((candidate) => candidate.state === 'undone');
	if (!operation) throw new Error('There is no file operation to redo.');
	restoreFiles(operation.before, operation.after);
	operation.state = 'applied';
	return operation;
}
