import {
	loadDatabases,
	loadModels,
	loadStorages,
	loadWebSearches,
} from '../../../../src/main/models';

function namesAreAlphabetical(entries: readonly { name: string }[]): boolean {
	return entries.every(
		(entry, index) => index === 0 || entries[index - 1].name.localeCompare(entry.name) <= 0
	);
}

describe('provider manifests', () => {
	it('routes manifest services to their matching catalog', () => {
		const openAi = loadModels().find(
			(model) => model.provider.id === 'openai' && model.id === 'gpt-5.6-sol'
		);
		const deepseek = loadModels().find(
			(model) => model.provider.id === 'deepseek' && model.id === 'deepseek-v4-flash'
		);
		const stableImage = loadModels().find(
			(model) => model.provider.id === 'stability-ai' && model.id === 'stable-image-core'
		);
		const openAiRealtime = loadModels().filter(
			(model) => model.provider.id === 'openai' && model.type === 'realtime-voice'
		);
		expect(stableImage?.metadata).toEqual(
			expect.objectContaining({
				documentationUrl: 'https://platform.stability.ai/docs/api-reference',
				documentationStatus: 'verified',
				inputs: expect.objectContaining({ aspect_ratio: expect.any(Object) }),
			})
		);
		expect(openAi?.provider.iconDarkUrl).toMatch(/^local-resource:\/\/file/);
		expect(openAi?.provider.iconDarkUrl).toContain(
			'/resources/providers/openai/images/fallback_lobehub/png_dark/openai.png'
		);
		expect(openAi?.provider.iconLightUrl).toMatch(/^local-resource:\/\/file/);
		expect(openAi?.provider.iconLightUrl).toContain(
			'/resources/providers/openai/images/fallback_lobehub/png_light/openai.png'
		);
		expect(deepseek?.metadata).toEqual(
			expect.objectContaining({ contextWindow: 1_048_576, defaultOutputTokens: 32_768 })
		);
		expect(openAiRealtime).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'gpt-realtime-2.1',
					default: true,
					sampleRate: 24_000,
					metadata: expect.objectContaining({
						documentationStatus: 'verified',
						inputs: expect.objectContaining({
							voice: expect.objectContaining({ default: 'marin' }),
						}),
					}),
				}),
				expect.objectContaining({ id: 'gpt-realtime-2.1-mini', sampleRate: 24_000 }),
			])
		);
		expect(
			loadModels().find(
				(model) => model.provider.id === 'luma' && model.type === 'realtime-voice'
			)
		).toBeUndefined();
		expect(loadWebSearches()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'brave-web-search',
					provider: expect.objectContaining({ id: 'brave' }),
				}),
			])
		);
		expect(loadDatabases()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'vector-database',
					provider: expect.objectContaining({ id: 'pinecone' }),
				}),
			])
		);
		expect(loadStorages()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'object-storage',
					provider: expect.objectContaining({ id: 'cloudflare' }),
				}),
			])
		);
		expect(namesAreAlphabetical(loadModels())).toBe(true);
		expect(namesAreAlphabetical(loadDatabases())).toBe(true);
		expect(namesAreAlphabetical(loadStorages())).toBe(true);
		expect(namesAreAlphabetical(loadWebSearches())).toBe(true);
	});
});
