const mockOn = jest.fn();
const mockSend = jest.fn();
const mockFetchChannel = jest.fn(async () => ({ isSendable: () => true, send: mockSend }));
const mockParseBuffer = jest.fn(async () => ({ format: { duration: 1.5 } }));

class MockAttachmentBuilder {
	readonly data: Buffer;
	readonly options: { name: string };
	duration?: number;
	waveform?: string;

	constructor(data: Buffer, options: { name: string }) {
		this.data = data;
		this.options = options;
	}

	setDuration(duration: number): this {
		this.duration = duration;
		return this;
	}

	setWaveform(waveform: string): this {
		this.waveform = waveform;
		return this;
	}
}

jest.mock('discord.js', () => ({
	AttachmentBuilder: MockAttachmentBuilder,
	Client: jest.fn().mockImplementation(() => ({
		on: mockOn,
		channels: { fetch: mockFetchChannel },
		login: jest.fn(),
		destroy: jest.fn(),
	})),
	Events: {
		ClientReady: 'ready',
		Error: 'error',
		MessageCreate: 'messageCreate',
		ShardDisconnect: 'shardDisconnect',
	},
	GatewayIntentBits: {
		Guilds: 1,
		GuildMessages: 2,
		DirectMessages: 4,
		MessageContent: 8,
	},
	MessageFlags: { IsVoiceMessage: 8192 },
	Partials: { Channel: 1 },
}));

jest.mock('music-metadata', () => ({ parseBuffer: mockParseBuffer }));

import { createDiscordAdapter } from '../../../../src/main/channels/adapters/discord';

describe('Discord voice messages', () => {
	beforeEach(() => {
		mockSend.mockReset();
		mockSend.mockResolvedValue({ id: 'sent-1' });
		mockFetchChannel.mockClear();
		mockParseBuffer.mockClear();
	});

	it('sends a native voice message with duration and waveform metadata', async () => {
		const adapter = createDiscordAdapter({ token: 'token' });
		const receipt = await adapter.send({
			channel: 'discord',
			to: 'channel-1',
			content: {
				type: 'voice',
				voice: { data: 'YWJj', mimeType: 'audio/mpeg', fileName: 'reply.mp3' },
				fallbackText: 'hello',
			},
		});

		expect(mockParseBuffer).toHaveBeenCalled();
		expect(mockSend).toHaveBeenCalledWith(
			expect.objectContaining({
				flags: 8192,
				files: [
					expect.objectContaining({
						duration: 1.5,
						waveform: expect.any(String),
					}),
				],
			})
		);
		expect(receipt.platformMessageIds).toEqual(['sent-1']);
	});
});
