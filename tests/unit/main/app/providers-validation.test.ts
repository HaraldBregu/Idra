import {
	parseProviderManifest,
	validateProviderManifest,
} from '../../../../src/shared/providers/validation';

describe('provider manifest validation', () => {
	it('rejects invalid service types and accepts supported manifest services', () => {
		const manifest = {
			providerId: 'acme',
			providerName: 'Acme',
			services: [
				{
					id: 'acme-chat',
					name: 'Acme Chat',
					type: 'large-language-model',
					url: 'https://api.acme.test/v1',
				},
			],
		};

		expect(parseProviderManifest(manifest)).toEqual(manifest);
		expect(
			parseProviderManifest({
				providerId: 'voice',
				providerName: 'Voice',
				services: [
					{
						id: 'voice-realtime',
						name: 'Voice Realtime',
						type: 'realtime-voice-model',
						url: 'https://api.voice.test/v1',
					},
				],
			})
		).toBeDefined();
		expect(
			parseProviderManifest({
				providerId: 'notion',
				providerName: 'Notion',
				services: [
					{ id: 'notion-mcp', name: 'Notion MCP', type: 'mcp', url: 'https://mcp.notion.com/mcp' },
				],
			})
		).toBeDefined();
		expect(
			validateProviderManifest({
				...manifest,
				services: [{ ...manifest.services[0], type: 'chat' }],
			})
		).toEqual([expect.stringContaining('services[0].type must be one of')]);
	});
});
