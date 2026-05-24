import path from 'node:path';
import { describeRagFile } from '../../../../src/main/rag';

describe('rag module', () => {
	it('classifies only files under memory/rag', () => {
		const workspace = path.resolve('/tmp/friday-memory-test');
		expect(describeRagFile(workspace, path.join(workspace, 'memory', 'rag', 'source.md'))).toMatchObject({
			corpus: 'rag',
			scopeKind: 'global',
			scopeId: 'rag',
			relativePath: path.join('memory', 'rag', 'source.md'),
		});
		expect(describeRagFile(workspace, path.join(workspace, 'memory', 'wiki', 'index.md'))).toBeUndefined();
		expect(describeRagFile(workspace, path.join(workspace, 'memory', 'chats', 'chat-a', 'note.md'))).toBeUndefined();
	});
});
