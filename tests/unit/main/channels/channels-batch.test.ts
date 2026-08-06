import { sendDurableMessageBatch } from '../../../../src/main/channels/channels_batch';
import type {
	ChannelDeliveryPart,
	ChannelOutboundMessage,
} from '../../../../src/main/channels/channels_types';

function outbound(text: string): ChannelOutboundMessage {
	return { channel: 'telegram', to: 'c1', content: { type: 'text', text }, accountId: 'acc' };
}

function part(id: string): ChannelDeliveryPart {
	return { platformMessageId: id, timestamp: 1 };
}

describe('sendDurableMessageBatch', () => {
	it('sends a single chunk when text fits', async () => {
		const sendPart = jest.fn(async (t: string) => part(t));
		const receipt = await sendDurableMessageBatch(outbound('hi'), sendPart, { maxLength: 10 });
		expect(sendPart).toHaveBeenCalledTimes(1);
		expect(receipt.status).toBe('sent');
		expect(receipt.platformMessageIds).toEqual(['hi']);
		expect(receipt.to).toBe('c1');
	});

	it('splits long text into chunks of maxLength', async () => {
		const sendPart = jest.fn(async (t: string) => part(t));
		const receipt = await sendDurableMessageBatch(outbound('abcdef'), sendPart, { maxLength: 2 });
		expect(sendPart.mock.calls.map((c) => c[0])).toEqual(['ab', 'cd', 'ef']);
		expect(receipt.status).toBe('sent');
		expect(receipt.parts).toHaveLength(3);
	});

	it('reports partial when a later chunk fails', async () => {
		const sendPart = jest
			.fn<Promise<ChannelDeliveryPart>, [string]>()
			.mockResolvedValueOnce(part('ab'))
			.mockRejectedValueOnce(new Error('rate limited'));
		const receipt = await sendDurableMessageBatch(outbound('abcd'), sendPart, { maxLength: 2 });
		expect(receipt.status).toBe('partial');
		expect(receipt.platformMessageIds).toEqual(['ab']);
		expect(receipt.error).toBe('rate limited');
	});

	it('reports failed when the first chunk fails', async () => {
		const sendPart = jest.fn(async () => {
			throw new Error('nope');
		});
		const receipt = await sendDurableMessageBatch(outbound('abcd'), sendPart, { maxLength: 2 });
		expect(receipt.status).toBe('failed');
		expect(receipt.platformMessageIds).toEqual([]);
		expect(receipt.error).toBe('nope');
	});

	it('sends one empty chunk for empty text', async () => {
		const sendPart = jest.fn(async (t: string) => part(t || 'empty'));
		const receipt = await sendDurableMessageBatch(outbound(''), sendPart, { maxLength: 5 });
		expect(sendPart).toHaveBeenCalledTimes(1);
		expect(receipt.status).toBe('sent');
	});
});
