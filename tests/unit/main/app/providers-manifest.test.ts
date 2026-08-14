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
		const runwayVideoModels = loadModels().filter(
			(model) => model.provider.id === 'runway' && model.type === 'text-to-video'
		);
		const openAiRealtime = loadModels().filter(
			(model) => model.provider.id === 'openai' && model.type === 'realtime-voice'
		);
		const realtimeVoiceModels = loadModels().filter((model) => model.type === 'realtime-voice');
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
		expect(runwayVideoModels.map((model) => model.id)).toEqual(
			expect.arrayContaining([
				'gen4.5',
				'seedance2_5',
				'grok_imagine_1_5',
				'seedance2',
				'seedance2_fast',
				'seedance2_mini',
				'hailuo3',
				'veo3.1',
				'veo3.1_fast',
				'happyhorse_1_0',
				'gemini_omni_flash',
			])
		);
		expect(runwayVideoModels).toHaveLength(11);
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
			realtimeVoiceModels.map((model) => ({ id: model.id, providerId: model.provider.id }))
		).toEqual([
			{ id: 'gpt-realtime-2.1', providerId: 'openai' },
			{ id: 'gpt-realtime-2.1-mini', providerId: 'openai' },
			{ id: 'grok-voice-latest', providerId: 'xai' },
		]);
		expect(realtimeVoiceModels).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'grok-voice-latest',
					sampleRate: 24_000,
					metadata: expect.objectContaining({
						documentationStatus: 'verified',
						inputs: expect.objectContaining({
							voice: expect.objectContaining({ default: 'eve' }),
						}),
					}),
				}),
			])
		);
		expect(loadModels().map((model) => model.id)).not.toEqual(
			expect.arrayContaining([
				'gemini-3.1-flash-live-preview',
				'qwen-omni-realtime',
				'qwen3.5-omni',
				'qwen3-omni-flash',
			])
		);
		expect(
			loadModels().find((model) => model.provider.id === 'luma' && model.type === 'realtime-voice')
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
