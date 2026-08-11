import type { RealtimeClientEvent, RealtimeServerEvent } from 'openai/resources/realtime/realtime';
import { OpenAIRealtimeVoiceAdapter } from '../../../../src/main/realtime_voice/openai';
import type { RealtimeSocket } from '../../../../src/main/realtime_voice/types';

class FakeSocket implements RealtimeSocket {
	readonly sent: RealtimeClientEvent[] = [];
	readonly socket = {
		readyState: 0,
		on: (event: 'open' | 'close', listener: (...args: unknown[]) => void) => {
			this.socketListeners[event].push(listener);
		},
	};
	private readonly socketListeners = { open: [] as Array<() => void>, close: [] as Array<() => void> };
	private readonly eventListeners: Array<(event: RealtimeServerEvent) => void> = [];
	private readonly errorListeners: Array<(error: Error) => void> = [];

	on(event: 'event' | 'error', listener: ((event: RealtimeServerEvent) => void) | ((error: Error) => void)): void {
		if (event === 'event') this.eventListeners.push(listener as (event: RealtimeServerEvent) => void);
		else this.errorListeners.push(listener as (error: Error) => void);
	}

	send(event: RealtimeClientEvent): void {
		this.sent.push(event);
	}

	close(): void {
		this.socketListeners.close.forEach((listener) => listener());
	}

	open(): void {
		this.socketListeners.open.forEach((listener) => listener());
	}

	event(event: RealtimeServerEvent): void {
		this.eventListeners.forEach((listener) => listener(event));
	}
}

describe('OpenAIRealtimeVoiceAdapter', () => {
	it('configures current Realtime audio events and forwards streamed output', async () => {
		const socket = new FakeSocket();
		const adapter = new OpenAIRealtimeVoiceAdapter(() => socket, 1_000);
		const events: Array<{ type: string }> = [];
		const connecting = adapter.connect(
			{
				apiKey: 'key',
				model: 'gpt-realtime-2.1',
				voice: 'marin',
				instructions: 'Help the user.',
				tools: [],
			},
			(event) => events.push(event)
		);
		socket.open();
		expect(socket.sent[0]).toMatchObject({
			type: 'session.update',
			session: {
				model: 'gpt-realtime-2.1',
				audio: {
					input: {
						format: { type: 'audio/pcm', rate: 24_000 },
						turn_detection: { type: 'server_vad', create_response: true, interrupt_response: true },
					},
					output: { format: { type: 'audio/pcm', rate: 24_000 }, voice: 'marin' },
				},
			},
		});
		socket.event({ type: 'session.updated', event_id: 'e', session: { type: 'realtime' } });
		const connection = await connecting;
		socket.event({
			type: 'response.output_audio.delta',
			event_id: 'e2',
			response_id: 'response',
			item_id: 'item',
			output_index: 0,
			content_index: 0,
			delta: 'AQI=',
		});
		expect(events).toContainEqual({
			type: 'assistant_audio_delta',
			responseId: 'response',
			itemId: 'item',
			audio: 'AQI=',
		});

		await connection.addToolResult('call', 'ok');
		expect(socket.sent.slice(-2)).toEqual([
			{
				type: 'conversation.item.create',
				item: { type: 'function_call_output', call_id: 'call', output: 'ok' },
			},
			{ type: 'response.create' },
		]);
	});

	it('fails startup after the bounded connection timeout', async () => {
		jest.useFakeTimers();
		const socket = new FakeSocket();
		const adapter = new OpenAIRealtimeVoiceAdapter(() => socket, 15_000);
		const connecting = adapter.connect(
			{
				apiKey: 'key',
				model: 'gpt-realtime-2.1-mini',
				voice: 'marin',
				instructions: '',
				tools: [],
			},
			() => undefined
		);
		jest.advanceTimersByTime(15_000);
		await expect(connecting).rejects.toThrow('timed out');
		jest.useRealTimers();
	});
});
