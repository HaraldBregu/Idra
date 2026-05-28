import { sendDurableMessageBatch } from '../../../../src/main/channels/message';

describe('sendDurableMessageBatch', () => {
	it('returns receipts for all delivered parts', async () => {
		const receipt = await sendDurableMessageBatch(
			{ type: 'telegram', to: 'chat', text: 'hello world' },
			async (text) => ({
				kind: 'text',
				platformMessageId: text,
				timestamp: 1,
			}),
			{ maxLength: 5 }
		);

		expect(receipt).toMatchObject({
			channelId: 'telegram',
			targetId: 'chat',
			status: 'sent',
			parts: [
				{ platformMessageId: 'hello' },
				{ platformMessageId: ' worl' },
				{ platformMessageId: 'd' },
			],
		});
	});

	it('marks partial failure without dropping prior receipts', async () => {
		const receipt = await sendDurableMessageBatch(
			{ type: 'telegram', to: 'chat', text: 'abcdef' },
			async (text) => {
				if (text === 'def') throw new Error('send failed');
				return {
					kind: 'text',
					platformMessageId: text,
					timestamp: 1,
				};
			},
			{ maxLength: 3 }
		);

		expect(receipt).toMatchObject({
			status: 'partial',
			error: 'send failed',
			parts: [{ platformMessageId: 'abc' }],
		});
	});
});
