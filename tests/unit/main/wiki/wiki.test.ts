import path from 'node:path';
import { describeWikiFile } from '../../../../src/main/wiki';

describe('wiki module', () => {
	it('classifies only files under memory/wiki', () => {
		const workspace = path.resolve('/tmp/friday-memory-test');
		expect(describeWikiFile(workspace, path.join(workspace, 'memory', 'wiki', 'index.md'))).toMatchObject({
			corpus: 'wiki',
			scopeKind: 'global',
			scopeId: 'wiki',
			relativePath: path.join('memory', 'wiki', 'index.md'),
		});
		expect(describeWikiFile(workspace, path.join(workspace, 'memory', 'rag', 'source.md'))).toBeUndefined();
		expect(describeWikiFile(workspace, path.join(workspace, 'memory', 'chats', 'chat-a', 'note.md'))).toBeUndefined();
	});
});
