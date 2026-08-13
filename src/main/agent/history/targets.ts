import { loadFileHistory } from './load';

export function fileHistoryTargets(direction: 'undo' | 'redo'): string[] {
	const operations = loadFileHistory().operations;
	const operation = direction === 'undo'
		? [...operations].reverse().find((candidate) => candidate.state === 'applied')
		: operations.find((candidate) => candidate.state === 'undone');
	if (!operation) return [];
	return [...new Set([...operation.before, ...operation.after].map((snapshot) => snapshot.path))];
}
