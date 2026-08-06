import path from 'node:path';

const readFileSync = jest.fn();
const writeFileSync = jest.fn();

jest.mock('node:fs', () => ({ readFileSync, writeFileSync }));
jest.mock('../../../../src/main/rag/rag_location', () => ({
	ragLocation: () => '/user/data/rag',
}));

import { readRagManifest, writeRagManifest } from '../../../../src/main/rag/rag_manifest';

const manifest = {
	indexName: 'friday',
	providerId: 'openai',
	modelId: 'text-embedding-3-small',
	dimensions: 1536,
};

it('writes the RAG manifest to rag/index.json', () => {
	writeRagManifest(manifest);

	expect(writeFileSync).toHaveBeenCalledWith(
		path.join('/user/data/rag', 'index.json'),
		JSON.stringify(manifest),
		'utf8'
	);
});

it('reads the RAG manifest from rag/index.json', () => {
	readFileSync.mockReturnValue(JSON.stringify(manifest));

	expect(readRagManifest()).toEqual(manifest);
	expect(readFileSync).toHaveBeenCalledWith(path.join('/user/data/rag', 'index.json'), 'utf8');
});
