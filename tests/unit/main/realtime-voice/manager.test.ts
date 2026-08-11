import { KeyedMutex } from '../../../../src/main/agent/mutex';
import { RealtimeVoiceManager } from '../../../../src/main/realtime_voice/manager';
import type {
	RealtimeVoiceAdapterEventHandler,
	RealtimeVoiceAdapterRequest,
	RealtimeVoiceConnection,
} from '../../../../src/main/realtime_voice/types';

class FakeConnection implements RealtimeVoiceConnection {
	readonly audio: string[] = [];
	readonly toolResults: Array<{ callId: string; output: string }> = [];
	interrupts = 0;
	stops = 0;
	append: (audio: string) => Promise<void> = async (audio) => {
		this.audio.push(audio);
	};

	appendAudio(audio: string): Promise<void> {
		return this.append(audio);
	}

	async interrupt(): Promise<void> {
		this.interrupts += 1;
	}

	async addToolResult(callId: string, output: string): Promise<void> {
		this.toolResults.push({ callId, output });
	}

	async stop(): Promise<void> {
		this.stops += 1;
	}
}

const configuration: RealtimeVoiceAdapterRequest & { providerId: string } = {
	providerId: 'openai',
	apiKey: 'key',
	model: 'gpt-realtime-2.1',
	voice: 'marin',
	instructions: 'Help the user.',
	tools: [],
};

describe('RealtimeVoiceManager', () => {
	it('persists only voice markers and native assistant transcripts while streaming UI events', async () => {
		const connection = new FakeConnection();
		let adapterEmit: RealtimeVoiceAdapterEventHandler = () => undefined;
		const events: Array<{ type: string; transcript?: string }> = [];
		const userTurns: string[] = [];
		const assistantTurns: string[] = [];
		const manager = new RealtimeVoiceManager({
			adapter: {
				connect: async (_request, emit) => {
					adapterEmit = emit;
					return connection;
				},
			},
			resolveConfiguration: async () => configuration,
			createConversation: () => ({
				addUserTurn: () => userTurns.push('Voice message'),
				addAssistantTranscript: (text) => assistantTurns.push(text),
			}),
			resources: new KeyedMutex(),
			emit: (_windowId, event) => events.push(event),
		});

		const session = await manager.start(7, { chatSessionId: 'chat' });
		adapterEmit({ type: 'input_speech_stopped', itemId: 'user-1' });
		adapterEmit({
			type: 'assistant_transcript_final',
			itemId: 'assistant-1',
			responseId: 'response-1',
			transcript: 'Hello there.',
		});
		adapterEmit({
			type: 'assistant_transcript_final',
			itemId: 'assistant-1',
			responseId: 'response-1',
			transcript: 'Hello there.',
		});

		expect(userTurns).toEqual(['Voice message']);
		expect(assistantTurns).toEqual(['Hello there.']);
		expect(events).toContainEqual({ type: 'user_turn', sessionId: session.id, itemId: 'user-1' });
		expect(events.find((event) => event.type === 'user_turn')).not.toHaveProperty('transcript');
	});

	it('bounds queued input while an adapter send is pending', async () => {
		const connection = new FakeConnection();
		let release = (): void => undefined;
		connection.append = () => new Promise<void>((resolve) => (release = resolve));
		const manager = new RealtimeVoiceManager({
			adapter: { connect: async () => connection },
			resolveConfiguration: async () => configuration,
			createConversation: () => ({ addUserTurn: () => undefined, addAssistantTranscript: () => undefined }),
			resources: new KeyedMutex(),
			emit: () => undefined,
		});
		const session = await manager.start(1, { chatSessionId: 'chat' });
		const first = manager.appendAudio(1, session.id, 'A'.repeat(900_000));
		expect(() => manager.appendAudio(1, session.id, 'A'.repeat(600_000))).toThrow('queue is full');
		release();
		await first;
	});

	it('invalidates and closes a late connection when concurrent starts target one window', async () => {
		const pending: Array<{
			resolve(connection: RealtimeVoiceConnection): void;
			emit: RealtimeVoiceAdapterEventHandler;
		}> = [];
		const manager = new RealtimeVoiceManager({
			adapter: {
				connect: (_request, emit) =>
					new Promise((resolve) => {
						pending.push({ resolve, emit });
					}),
			},
			resolveConfiguration: async () => configuration,
			createConversation: () => ({ addUserTurn: () => undefined, addAssistantTranscript: () => undefined }),
			resources: new KeyedMutex(),
			emit: () => undefined,
		});

		const firstStart = manager.start(3, { chatSessionId: 'first' });
		await Promise.resolve();
		await Promise.resolve();
		const secondStart = manager.start(3, { chatSessionId: 'second' });
		await Promise.resolve();
		await Promise.resolve();
		expect(pending).toHaveLength(2);

		const lateFirst = new FakeConnection();
		const current = new FakeConnection();
		pending[0].resolve(lateFirst);
		pending[1].resolve(current);
		await expect(firstStart).rejects.toThrow('stopped during connection');
		const second = await secondStart;
		expect(lateFirst.stops).toBe(1);

		await manager.stop(3, second.id);
		expect(current.stops).toBe(1);
	});
});
