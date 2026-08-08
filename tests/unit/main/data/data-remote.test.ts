const deleteNamespace = jest.fn();
const index = jest.fn(() => ({ deleteNamespace }));
const ragClient = jest.fn(() => ({ index }));

jest.mock('../../../../src/main/rag/rag_client', () => ({ ragClient }));

import { DataController } from '../../../../src/main/data/data_controller';

it('purges only an explicitly scoped remote namespace and never the Pinecone index', async () => {
	const controller = new DataController({
		config: { location: '/workspace' },
		listSessions: () => [],
		deleteSession: jest.fn(),
	});
	const scope = {
		kind: 'rag' as const,
		mode: 'remote_namespace' as const,
		indexName: 'knowledge-base',
		generation: 'friday-11111111-1111-4111-8111-111111111111',
	};
	const preview = await controller.previewPurge(scope);

	expect(preview.remoteDataIncluded).toBe(true);
	await expect(controller.export(scope, '/tmp/export.json')).rejects.toThrow(
		'Remote namespaces cannot be exported'
	);
	await expect(controller.purge(scope, preview.confirmationId)).resolves.toEqual(
		expect.objectContaining({ remoteDataDeleted: true })
	);
	expect(index).toHaveBeenCalledWith('knowledge-base');
	expect(deleteNamespace).toHaveBeenCalledWith(scope.generation);
	expect(index.mock.results[0].value).not.toHaveProperty('deleteIndex');
});
