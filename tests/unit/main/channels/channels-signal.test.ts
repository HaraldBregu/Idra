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

	it('receives and lazily loads a voice attachment', async () => {
		const event = {
			jsonrpc: '2.0',
			method: 'receive',
			params: {
				envelope: {
					sourceNumber: '+391111111111',
					timestamp: 42,
					dataMessage: {
						timestamp: 42,
						attachments: [
							{ id: 'attachment-1', contentType: 'audio/aac', size: 3 },
						],
					},
				},
			},
		};
		global.fetch = jest.fn(async (input, init) => {
			const url = String(input);
			if (url.endsWith('/check')) return new Response(null, { status: 200 });
			if (url.endsWith('/events')) {
				return new Response(`data: ${JSON.stringify(event)}\r\n\r\n`, {
					status: 200,
					headers: { 'content-type': 'text/event-stream' },
				});
			}
			const body = JSON.parse(String(init?.body)) as { method: string; params: Record<string, unknown> };
			expect(body).toMatchObject({
				method: 'getAttachment',
				params: { id: 'attachment-1', recipient: '+391111111111' },
			});
			return new Response(JSON.stringify({ result: { data: 'YWJj' } }), {
				status: 200,
				headers: { 'content-type': 'application/json' },
			});
		}) as typeof fetch;
		const adapter = createSignalAdapter({ accountId: '+390000000000' });
		const received = new Promise<Parameters<Parameters<typeof adapter.onMessage>[0]>[0]>((resolve) => {
			adapter.onMessage((message) => {
				void adapter.stop();
				resolve(message);
			});
		});

		await adapter.start();
		const message = await received;
		expect(message.content.type).toBe('voice');
		if (message.content.type !== 'voice') throw new Error('Expected voice message');
		expect(await message.content.voice.load()).toMatchObject({
			data: 'YWJj',
			mimeType: 'audio/aac',
			byteLength: 3,
		});
	});
});
