const mockUuidV5 = jest.fn((name: string) => {
	const suffix = [...name]
		.reduce((hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0, 0)
		.toString(16)
		.padStart(12, '0');
	return `00000000-0000-5000-8000-${suffix}`;
});

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
		const sessionId = channelSessionId(identity);
		expect(sessionId).toMatch(/^00000000-0000-5000-8000-[0-9a-f]{12}$/);
		expect(sessionId).not.toContain(identity.accountId);
		expect(channelSessionId(identity)).toBe(sessionId);
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
		expect(channelSessionId({ ...identity, ...patch })).not.toBe(channelSessionId(identity));
	});
});
