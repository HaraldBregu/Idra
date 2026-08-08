import path from 'node:path';

const readFileSync = jest.fn();

jest.mock('node:fs', () => ({ readFileSync }));
jest.mock('../../../../src/main/rag/rag_location', () => ({
	ragLocation: () => '/user/data/rag',
}));

import { readRagArtifact } from '../../../../src/main/rag/rag_artifact';

it('reads a Friday-owned versioned artifact from the local RAG directory', () => {
	const artifact = {
		indexName: 'knowledge-base',
		activeNamespace: 'friday-build-one',
		providerId: 'openai',
		modelId: 'text-embedding-3-small',
		dimensions: 2,
		records: [],
	};
	readFileSync.mockReturnValue(JSON.stringify(artifact));

	expect(readRagArtifact('embeddings-friday-build-one.json')).toEqual(artifact);
	expect(readFileSync).toHaveBeenCalledWith(
		path.join('/user/data/rag', 'embeddings-friday-build-one.json'),
		'utf8'
	);
});

it('rejects artifact paths outside the local RAG directory', () => {
	expect(readRagArtifact('../embeddings-friday-build-one.json')).toBeUndefined();
	expect(readFileSync).not.toHaveBeenCalled();
});
