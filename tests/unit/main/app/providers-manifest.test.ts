import { loadDatabases, loadModels, loadStorages, loadWebSearches } from '../../../../src/main/app/models';

describe('provider manifests', () => {
	it('routes manifest services to their matching catalog', () => {
		const openAi = loadModels().find((model) => model.provider.id === 'openai' && model.id === 'gpt-5.6-sol');
		expect(openAi?.provider.iconDarkUrl).toContain('local-resource://file/resources/providers/openai/images/fallback_lobehub/png_dark/openai.png');
		expect(openAi?.provider.iconLightUrl).toContain('local-resource://file/resources/providers/openai/images/fallback_lobehub/png_light/openai.png');
		expect(loadWebSearches()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'brave-web-search', provider: expect.objectContaining({ id: 'brave' }) }),
			])
		);
		expect(loadDatabases()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'vector-database', provider: expect.objectContaining({ id: 'pinecone' }) }),
			])
		);
		expect(loadStorages()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'object-storage', provider: expect.objectContaining({ id: 'cloudflare' }) }),
			])
		);
	});
});
