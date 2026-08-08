const mockUuidV5 = jest.fn(() => '4c15bc8c-273f-5dfa-8331-c6a1c82d1ae3');

jest.mock('uuid', () => ({
	v5: (...args: unknown[]) => mockUuidV5(...args),
}));

import { channelSessionId } from '../../../../src/main/channels/channels_session';
import type { ChannelInboundMessage } from '../../../../src/main/channels/channels_types';

const identity: Pick<ChannelInboundMessage, 'channel' | 'accountId' | 'chatId' | 'threadId'> = {
	channel: 'telegram',
	accountId: 'account-1',
	chatId: 'chat-1',
	threadId: 'thread-1',
};

describe('channelSessionId', () => {
	it('derives a UUIDv5 from the complete channel route without exposing it in the result', () => {
		expect(channelSessionId(identity)).toBe('4c15bc8c-273f-5dfa-8331-c6a1c82d1ae3');
		expect(mockUuidV5).toHaveBeenCalledWith(
			JSON.stringify(['telegram', 'account-1', 'chat-1', 'thread-1']),
			expect.stringMatching(/^[0-9a-f-]{36}$/)
		);
	});

	it.each([
		['channel', { channel: 'discord' }],
		['account', { accountId: 'account-2' }],
		['chat', { chatId: 'chat-2' }],
		['thread', { threadId: 'thread-2' }],
		['missing thread', { threadId: undefined }],
	] as const)('uses %s as part of the UUIDv5 name', (_label, patch) => {
		channelSessionId({ ...identity, ...patch });
		expect(mockUuidV5.mock.calls[0][0]).not.toBe(JSON.stringify(Object.values(identity)));
	});
});
