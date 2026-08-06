import { createSignalAdapter } from '../../../../src/main/channels/adapters/signal';

describe('Signal adapter', () => {
	const originalFetch = global.fetch;

	afterEach(() => {
		global.fetch = originalFetch;
	});

	it('sends native voice-note data through JSON-RPC', async () => {
		global.fetch = jest.fn(async () =>
			new Response(JSON.stringify({ jsonrpc: '2.0', id: '1', result: { timestamp: 42 } }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			})
		) as typeof fetch;
		const adapter = createSignalAdapter({
			accountId: '+390000000000',
			baseUrl: 'http://127.0.0.1:8080',
		});

		const receipt = await adapter.send({
			channel: 'signal',
			accountId: '+390000000000',
			to: '+391111111111',
			chatType: 'dm',
			content: {
				type: 'voice',
				voice: { data: 'YWJj', mimeType: 'audio/mpeg', fileName: 'reply.mp3' },
				fallbackText: 'hello',
			},
		});

		const request = (global.fetch as jest.Mock).mock.calls[0][1] as RequestInit;
		const body = JSON.parse(String(request.body)) as {
			params: { attachment: string; voiceNote: boolean; recipient: string[] };
		};
		expect(body.params).toMatchObject({
			attachment: 'data:audio/mpeg;base64,YWJj',
			voiceNote: true,
			recipient: ['+391111111111'],
		});
		expect(receipt.platformMessageIds).toEqual(['42']);
	});

	it('rejects non-local daemon endpoints', () => {
		expect(() =>
			createSignalAdapter({ accountId: '+390000000000', baseUrl: 'https://example.com' })
		).toThrow('loopback');
	});
});
