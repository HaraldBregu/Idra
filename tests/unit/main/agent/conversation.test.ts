import { Conversation } from '../../../../src/main/agent/conversation';
import type { Agent } from '../../../../src/main/agent/agent';
import type { RealtimeVoiceManager } from '../../../../src/main/agent/realtime_voice';

it('switches text and voice conversations through one entry point', async () => {
	const send = jest.fn(async () => 'text reply');
	const voiceSession = {
		id: 'voice-session',
		providerId: 'openai',
		modelId: 'gpt-realtime-2.1',
		input: { format: 'pcm16' as const, sampleRate: 24_000 as const, channels: 1 as const },
		output: { format: 'pcm16' as const, sampleRate: 24_000 as const, channels: 1 as const },
	};
	const voice = {
		start: jest.fn(async () => voiceSession),
		appendAudio: jest.fn(async () => undefined),
		interrupt: jest.fn(async () => undefined),
		stop: jest.fn(async () => undefined),
		stopWindow: jest.fn(async () => undefined),
		stopAll: jest.fn(async () => undefined),
	} as unknown as RealtimeVoiceManager;
	const conversation = new Conversation({ send } as unknown as Agent, voice);
	const options = { type: 'default' as const };

	await expect(
		conversation.execute({ type: 'text', message: 'hello', agentId: 'main', options })
	).resolves.toBe('text reply');
	await expect(
		conversation.execute({
			type: 'voice',
			action: 'start',
			windowId: 7,
			request: { chatSessionId: 'chat' },
		})
	).resolves.toBe(voiceSession);
	await conversation.execute({
		type: 'voice',
		action: 'append-audio',
		windowId: 7,
		sessionId: 'voice-session',
		audio: 'AAAA',
	});
	await conversation.execute({
		type: 'voice',
		action: 'interrupt',
		windowId: 7,
		sessionId: 'voice-session',
	});
	await conversation.execute({
		type: 'voice',
		action: 'stop',
		windowId: 7,
		sessionId: 'voice-session',
	});
	await conversation.execute({ type: 'voice', action: 'stop-window', windowId: 7 });
	await conversation.execute({ type: 'voice', action: 'stop-all' });

	expect(send).toHaveBeenCalledWith('hello', 'main', options);
	expect(voice.start).toHaveBeenCalledWith(7, { chatSessionId: 'chat' });
	expect(voice.appendAudio).toHaveBeenCalledWith(7, 'voice-session', 'AAAA');
	expect(voice.interrupt).toHaveBeenCalledWith(7, 'voice-session');
	expect(voice.stop).toHaveBeenCalledWith(7, 'voice-session');
	expect(voice.stopWindow).toHaveBeenCalledWith(7);
	expect(voice.stopAll).toHaveBeenCalledWith();
});
