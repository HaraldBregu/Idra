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
					metadata: {
						documentationUrl: 'https://docs.acme.test/chat',
						inputs: {},
						promptAttachments: [],
					},
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

	it.each(['large-language-model', 'research-chat-model']) (
		'requires prompt attachment metadata for %s services',
		(type) => {
			const errors = validateProviderManifest({
				providerId: 'acme',
				providerName: 'Acme',
				services: [{ id: 'chat', name: 'Chat', type, url: 'https://api.acme.test' }],
			});

			expect(errors).toContainEqual(expect.stringContaining('metadata must be an object'));
		}
	);

	it('accepts deeply valid prompt attachment rules', () => {
		expect(
			validateProviderManifest({
				providerId: 'acme',
				providerName: 'Acme',
				services: [
					{
						id: 'chat',
						name: 'Chat',
						type: 'large-language-model',
						url: 'https://api.acme.test',
						metadata: {
							promptAttachments: [
								{
									kind: 'image',
									mimeTypes: ['image/jpeg', 'image/png'],
									extensions: ['.jpg', '.jpeg', '.png'],
									maxFiles: 3,
									maxBytes: 20 * 1024 * 1024,
									maxTotalBytes: 50 * 1024 * 1024,
								},
							],
						},
					},
				],
			})
		).toEqual([]);
	});

	it.each([
		['unsupported kind', { kind: 'archive', mimeTypes: ['application/zip'], extensions: ['.zip'] }, 'kind'],
		['missing MIME array', { kind: 'image', extensions: ['.png'] }, 'mimeTypes'],
		['empty MIME array', { kind: 'image', mimeTypes: [], extensions: ['.png'] }, 'mimeTypes'],
		['invalid MIME', { kind: 'image', mimeTypes: ['image'], extensions: ['.png'] }, 'mimeTypes[0]'],
		['missing extension array', { kind: 'image', mimeTypes: ['image/png'] }, 'extensions'],
		['empty extension array', { kind: 'image', mimeTypes: ['image/png'], extensions: [] }, 'extensions'],
		['uppercase extension', { kind: 'image', mimeTypes: ['image/png'], extensions: ['.PNG'] }, 'extensions[0]'],
		['extension without dot', { kind: 'image', mimeTypes: ['image/png'], extensions: ['png'] }, 'extensions[0]'],
		['zero file limit', { kind: 'image', mimeTypes: ['image/png'], extensions: ['.png'], maxFiles: 0 }, 'maxFiles'],
		['fractional byte limit', { kind: 'image', mimeTypes: ['image/png'], extensions: ['.png'], maxBytes: 1.5 }, 'maxBytes'],
		['negative total limit', { kind: 'image', mimeTypes: ['image/png'], extensions: ['.png'], maxTotalBytes: -1 }, 'maxTotalBytes'],
	])('rejects %s', (_label, rule, expectedPath) => {
		const errors = validateProviderManifest({
			providerId: 'acme',
			providerName: 'Acme',
			services: [
				{
					id: 'chat',
					name: 'Chat',
					type: 'large-language-model',
					url: 'https://api.acme.test',
					metadata: { promptAttachments: [rule] },
				},
			],
		});

		expect(errors).toContainEqual(expect.stringContaining(expectedPath));
	});
});
