import { loadFileHistory } from './load';
import { restoreFiles } from './restore';
import { saveFileHistory } from './save';
import type { FileOperation } from './types';

export function redoFileOperation(): FileOperation {
	const history = loadFileHistory();
	const operation = history.operations.find((candidate) => candidate.state === 'undone');
	if (!operation) throw new Error('There is no file operation to redo.');
	restoreFiles(operation.before, operation.after);
	operation.state = 'applied';
	saveFileHistory(history);
	return operation;
}
