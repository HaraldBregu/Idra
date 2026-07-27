import {
	beginCommand,
	createContext,
	createContextState,
	enqueueCommand,
	finishCommand,
	interruptCommands,
	type AgentCommand,
} from '../../../../../src/main/agent/context';

describe('agent context state limits', () => {
	it('caps completed history and errors', () => {
		const state = createContextState(createContext());
		for (let index = 0; index < 205; index += 1) {
			const command: AgentCommand = {
				id: String(index),
				agentId: 'main',
				message: `message ${index}`,
				options: {},
				queuedAt: index,
			};
			enqueueCommand(state, command);
			beginCommand(state, command);
			finishCommand(state, command, { status: 'error', error: `error ${index}` }, index);
		}

		expect(state.history).toHaveLength(200);
		expect(state.errors).toHaveLength(200);
		expect(state.history[0].command.id).toBe('5');
		expect(state.errors[0]).toBe('error 5');
	});

	it('caps history when pending commands are interrupted in one batch', () => {
		const state = createContextState(createContext());
		for (let index = 0; index < 205; index += 1) {
			enqueueCommand(state, {
				id: String(index),
				agentId: 'main',
				message: `message ${index}`,
				options: {},
				queuedAt: index,
			});
		}

		interruptCommands(state);

		expect(state.history).toHaveLength(200);
		expect(state.history[0].command.id).toBe('5');
	});
});
