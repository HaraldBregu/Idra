import {
	createContext,
	createContextState,
	enqueueCommand,
	beginCommand,
	finishCommand,
	trackEvent,
	type AgentCommand,
} from '../../../../../src/main/agent/context';

describe('scratch: what history retains', () => {
	it('keeps attachment payloads and the streamEvent closure alive after the run ends', () => {
		const state = createContextState(createContext());
		const bigAttachment = 'A'.repeat(1_000_000);
		let closureAlive = false;
		const command: AgentCommand = {
			id: '1',
			agentId: 'main',
			message: 'describe this image',
			options: {
				files: [{ name: 'photo.png', mimeType: 'image/png', data: bigAttachment }],
				streamEvent: () => {
					closureAlive = true;
				},
			},
			queuedAt: 0,
		};

		enqueueCommand(state, command);
		beginCommand(state, command);
		finishCommand(state, command, { status: 'ok', response: 'done' }, 0);

		const retained = state.history[0].command.options as {
			files: { data: string }[];
			streamEvent: () => void;
		};
		expect(retained.files[0].data).toHaveLength(1_000_000);
		retained.streamEvent();
		expect(closureAlive).toBe(true);
	});

	it('tracked execution/task fields are written but read by nothing', () => {
		const state = createContextState(createContext());
		const command: AgentCommand = {
			id: '1',
			agentId: 'main',
			message: 'hi',
			options: {},
			queuedAt: 0,
		};
		enqueueCommand(state, command);
		beginCommand(state, command);
		trackEvent(state, { type: 'assistant_message', content: 'x', toolCalls: [] });
		finishCommand(state, command, { status: 'ok' }, 0);

		expect(state.task).toEqual({ description: 'hi', turns: 1, toolCalls: 0 });
		expect(state.execution).toEqual({ phase: 'idle' });
	});
});
