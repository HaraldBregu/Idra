import { loadFileHistory } from './load';
import { restoreFiles } from './restore';
import { saveFileHistory } from './save';
import type { FileOperation } from './types';

export function undoFileOperation(): FileOperation {
	const history = loadFileHistory();
	const operation = [...history.operations].reverse().find((candidate) => candidate.state === 'applied');
	if (!operation) throw new Error('There is no file operation to undo.');
	restoreFiles(operation.after, operation.before);
	operation.state = 'undone';
	saveFileHistory(history);
	return operation;
}
