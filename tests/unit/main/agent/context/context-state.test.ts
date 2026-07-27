import {
	beginCommand,
	createContext,
	createContextState,
	enqueueCommand,
	finishCommand,
	interruptCommands,
	type AgentCommand,
} from '../../../../../src/main/agent/context';

const command = (id: string, agentId = 'main'): AgentCommand => ({
	id,
	agentId,
	message: `message ${id}`,
	options: {},
	queuedAt: 0,
});

describe('agent context state', () => {
	it('moves a command from pending to current and clears it on finish', () => {
		const state = createContextState(createContext());
		const first = command('1');

		enqueueCommand(state, first);
		expect(state.pending).toEqual([first]);

		beginCommand(state, first);
		expect(state.pending).toEqual([]);
		expect(state.current).toBe(first);

		finishCommand(state, first);
		expect(state.current).toBeUndefined();
	});

	it('leaves a newer current command alone when an older one finishes', () => {
		const state = createContextState(createContext());
		const older = command('1');
		const newer = command('2');

		beginCommand(state, newer);
		finishCommand(state, older);
		expect(state.current).toBe(newer);
	});

	it('drops every pending command when no agent is given', () => {
		const state = createContextState(createContext());
		enqueueCommand(state, command('1', 'main'));
		enqueueCommand(state, command('2', 'cron'));

		interruptCommands(state);
		expect(state.pending).toEqual([]);
	});

	it('drops only the named agent commands', () => {
		const state = createContextState(createContext());
		const kept = command('2', 'cron');
		enqueueCommand(state, command('1', 'main'));
		enqueueCommand(state, kept);

		interruptCommands(state, 'main');
		expect(state.pending).toEqual([kept]);
	});
});
