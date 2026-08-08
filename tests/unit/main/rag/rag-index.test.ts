import path from 'node:path';

const appendFile = jest.fn();
const lstat = jest.fn();
const mkdir = jest.fn();
const readFile = jest.fn();
const readdir = jest.fn();
const rename = jest.fn();
const rm = jest.fn();
const stat = jest.fn();
const writeFile = jest.fn();
const createEmbedding = jest.fn();
const upsert = jest.fn();
const namespace = jest.fn(() => ({ upsert }));
const index = jest.fn(() => ({ namespace }));
const createIndex = jest.fn();
const ragClient = jest.fn(() => ({ createIndex, index }));
const writeRagManifest = jest.fn();

jest.mock('node:fs/promises', () => ({
	appendFile,
	lstat,
	mkdir,
	readFile,
	readdir,
	rename,
	rm,
	stat,
	writeFile,
}));
jest.mock('../../../../src/main/models/embedding', () => ({ createEmbedding }));
jest.mock('../../../../src/main/rag/rag_client', () => ({ ragClient }));
jest.mock('../../../../src/main/rag/rag_location', () => ({
	ragLocation: () => path.join('/user/data', 'rag'),
}));
jest.mock('../../../../src/main/rag/rag_manifest', () => ({ writeRagManifest }));

import { indexRag } from '../../../../src/main/rag/rag_index';

beforeEach(() => {
	jest.clearAllMocks();
	stat.mockResolvedValue({ isDirectory: () => true });
	lstat.mockResolvedValue({ isFile: () => true });
	readdir.mockResolvedValue(['guide.md']);
	readFile.mockResolvedValue(Buffer.from('# Guide'));
	createEmbedding.mockResolvedValue({
		providerId: 'openai',
		modelId: 'text-embedding-3-small',
		dimensions: 2,
		embeddings: [[0.1, 0.2]],
	});
	createIndex.mockResolvedValue(undefined);
	upsert.mockResolvedValue(undefined);
	appendFile.mockResolvedValue(undefined);
	mkdir.mockResolvedValue(undefined);
	rename.mockResolvedValue(undefined);
	rm.mockResolvedValue(undefined);
	writeFile.mockResolvedValue(undefined);
});

it('saves the completed embedding index directly under the RAG directory', async () => {
	const result = await indexRag(['/documents'], 'knowledge-base');
	const directory = path.join('/user/data', 'rag');
	const temporaryOutputFile = writeFile.mock.calls[0][0] as string;
	const outputFile = temporaryOutputFile.slice(0, -4);
	const activeNamespace = namespace.mock.calls[0][0] as string;
	const artifactFile = path.basename(outputFile);
	const initialContent = writeFile.mock.calls[0][1] as string;
	const appendedContent = appendFile.mock.calls
		.filter(([file]) => file === temporaryOutputFile)
		.map(([, content]) => content)
		.join('');
	const saved = JSON.parse(`${initialContent}${appendedContent}`) as {
		indexName: string;
		providerId: string;
		modelId: string;
		dimensions: number;
		activeNamespace: string;
		records: Array<{ id: string; values: number[]; metadata: { path: string; text: string } }>;
	};

	expect(result).toEqual({ files: 1, vectors: 1 });
	expect(mkdir).toHaveBeenCalledWith(directory, { recursive: true });
	expect(saved).toEqual({
		indexName: 'knowledge-base',
		providerId: 'openai',
		modelId: 'text-embedding-3-small',
		dimensions: 2,
		activeNamespace,
		records: [
			{
				id: '0:guide.md#0',
				values: [0.1, 0.2],
				metadata: { path: path.join('documents', 'guide.md'), text: '# Guide' },
			},
		],
	});
	expect(rename).toHaveBeenCalledWith(temporaryOutputFile, outputFile);
	expect(activeNamespace).toMatch(/^friday-[a-f0-9-]+$/);
	expect(writeRagManifest).toHaveBeenCalledWith({
		indexName: 'knowledge-base',
		activeNamespace,
		artifactFile,
		providerId: 'openai',
		modelId: 'text-embedding-3-small',
		dimensions: 2,
		completedAt: expect.any(String),
	});
	expect(writeRagManifest.mock.invocationCallOrder[0]).toBeGreaterThan(
		rename.mock.invocationCallOrder[0]
	);
	expect(upsert).toHaveBeenCalledWith({
		records: [{ id: '0:guide.md#0', values: [0.1, 0.2] }],
	});
});

it('indexes nested and extensionless text files while skipping binary files', async () => {
	readdir.mockResolvedValue(['nested', 'nested/guide.txt', 'README', 'nested/image.png']);
	lstat.mockImplementation(async (filePath: string) => ({
		isFile: () => filePath !== path.join('/documents', 'nested'),
	}));
	readFile.mockImplementation(async (filePath: string) => {
		if (filePath.endsWith('image.png')) return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
		if (filePath.endsWith('README')) return Buffer.from('Extensionless notes');
		return Buffer.from('Nested guide');
	});

	const result = await indexRag(['/documents'], 'knowledge-base');
	const records = upsert.mock.calls.flatMap(([request]) => request.records);

	expect(result).toEqual({ files: 2, vectors: 2 });
	expect(records).toEqual([
		expect.objectContaining({
			id: '0:README#0',
		}),
		expect.objectContaining({
			id: '0:nested/guide.txt#0',
		}),
	]);
	expect(createEmbedding.mock.calls.map(([request]) => request.texts[0])).toEqual([
		'Extensionless notes',
		'Nested guide',
	]);
});

it('does not publish a failed namespace build over the prior manifest', async () => {
	upsert.mockRejectedValueOnce(new Error('remote failure'));

	await expect(indexRag(['/documents'], 'knowledge-base')).rejects.toThrow('remote failure');
	expect(writeRagManifest).not.toHaveBeenCalled();
	expect(rename).not.toHaveBeenCalled();
});

it('refuses to upload credential-like text files', async () => {
	readdir.mockResolvedValue(['.env']);
	readFile.mockResolvedValue(Buffer.from('API_KEY=abcdefghijklmnopqrstuvwxyz123456'));

	await expect(indexRag(['/documents'], 'knowledge-base')).rejects.toThrow(
		'Refusing to ingest credential-like file: .env'
	);
	expect(createEmbedding).not.toHaveBeenCalled();
});
