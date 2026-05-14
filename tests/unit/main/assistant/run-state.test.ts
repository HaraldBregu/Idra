import { RunState } from '../../../../src/main/assistant/run-state';

describe('RunState', () => {
	const baseInit = () =>
		RunState.initial({
			runId: 'run-1',
			userMessage: 'hello',
			systemPrompt: 'sys',
			input: [],
			newMessages: [{ role: 'user', content: 'hello' }],
		});

	describe('initial()', () => {
		it('starts with iteration 0 and no decisions or pending approvals', () => {
			const state = baseInit();
			expect(state.data.iteration).toBe(0);
			expect(state.pending()).toEqual([]);
			expect(state.hasPending()).toBe(false);
			expect(state.data.alwaysApproveTools).toEqual([]);
			expect(state.data.alwaysRejectTools).toEqual([]);
			expect(state.data.decisionsByCallId).toEqual({});
		});

		it('keeps the supplied messages and input', () => {
			const state = baseInit();
			expect(state.data.userMessage).toBe('hello');
			expect(state.data.systemPrompt).toBe('sys');
			expect(state.data.newMessages).toHaveLength(1);
		});
	});

	describe('approve()/reject()', () => {
		it('records explicit per-call decisions', () => {
			const state = baseInit();
			state.setPending([
				{ callId: 'c1', toolName: 'exec', arguments: '{}' },
				{ callId: 'c2', toolName: 'write_file', arguments: '{}' },
			]);

			state.approve('c1');
			state.reject('c2', { message: 'no thanks' });

			expect(state.decisionFor('c1', 'exec')).toEqual({ decision: 'approve' });
			expect(state.decisionFor('c2', 'write_file')).toEqual({
				decision: 'reject',
				message: 'no thanks',
			});
		});

		it('persists alwaysApprove across new call ids', () => {
			const state = baseInit();
			state.setPending([{ callId: 'c1', toolName: 'exec', arguments: '{}' }]);
			state.approve('c1', { alwaysApprove: true });

			// New call to same tool — no explicit decision yet
			expect(state.decisionFor('c-new', 'exec')).toEqual({ decision: 'approve' });
		});

		it('persists alwaysReject across new call ids', () => {
			const state = baseInit();
			state.setPending([{ callId: 'c1', toolName: 'exec', arguments: '{}' }]);
			state.reject('c1', { alwaysReject: true });

			expect(state.decisionFor('c-new', 'exec')).toEqual({ decision: 'reject' });
		});

		it('does not register an alwaysApprove entry for an unknown pending callId', () => {
			const state = baseInit();
			state.approve('unknown', { alwaysApprove: true });
			expect(state.data.alwaysApproveTools).toEqual([]);
		});
	});

	describe('serialize roundtrip', () => {
		it('survives toString/fromString with decisions and sticky rules intact', () => {
			const state = baseInit();
			state.setPending([{ callId: 'c1', toolName: 'exec', arguments: '{"x":1}' }]);
			state.approve('c1', { alwaysApprove: true });
			state.data.iteration = 3;

			const restored = RunState.fromString(state.toString());

			expect(restored.data.iteration).toBe(3);
			expect(restored.decisionFor('c1', 'exec')).toEqual({ decision: 'approve' });
			expect(restored.decisionFor('cN', 'exec')).toEqual({ decision: 'approve' });
		});

		it('defaults missing fields when restoring a partial payload', () => {
			const restored = RunState.fromJSON({
				runId: 'r',
				userMessage: 'm',
				input: [],
				newMessages: [],
				iteration: 0,
				pendingApprovals: [],
				decisionsByCallId: {},
				alwaysApproveTools: [],
				alwaysRejectTools: [],
			});
			expect(restored.hasPending()).toBe(false);
		});
	});

	describe('clearResolved()', () => {
		it('drops pending entries that already have a decision', () => {
			const state = baseInit();
			state.setPending([
				{ callId: 'c1', toolName: 'exec', arguments: '{}' },
				{ callId: 'c2', toolName: 'write_file', arguments: '{}' },
			]);
			state.approve('c1');
			state.clearResolved();
			expect(state.pending()).toEqual([
				{ callId: 'c2', toolName: 'write_file', arguments: '{}' },
			]);
		});

		it('drops pending inputs that already have an answer', () => {
			const state = baseInit();
			state.setPendingInputs([
				{ callId: 'i1', toolName: 'ask_human', question: 'a?' },
				{ callId: 'i2', toolName: 'ask_human', question: 'b?' },
			]);
			state.recordInputResponse('i1', 'answer a');
			state.clearResolved();
			expect(state.pendingInputs()).toEqual([
				{ callId: 'i2', toolName: 'ask_human', question: 'b?' },
			]);
		});
	});

	describe('input responses', () => {
		it('records and retrieves an input response', () => {
			const state = baseInit();
			state.recordInputResponse('i1', 'hello');
			expect(state.inputResponseFor('i1')).toBe('hello');
		});

		it('survives serialization', () => {
			const state = baseInit();
			state.recordInputResponse('i1', 'hello');
			state.setPendingInputs([{ callId: 'i1', toolName: 'ask_human', question: 'q?' }]);
			const restored = RunState.fromString(state.toString());
			expect(restored.inputResponseFor('i1')).toBe('hello');
			expect(restored.pendingInputs()).toEqual([
				{ callId: 'i1', toolName: 'ask_human', question: 'q?' },
			]);
		});
	});

	describe('editedArguments on approval', () => {
		it('stores editedArguments alongside the approve decision', () => {
			const state = baseInit();
			state.setPending([{ callId: 'c1', toolName: 'write_file', arguments: '{"path":"/x"}' }]);
			state.approve('c1', { editedArguments: '{"path":"/y"}' });
			expect(state.decisionFor('c1', 'write_file')).toEqual({
				decision: 'approve',
				editedArguments: '{"path":"/y"}',
			});
		});
	});
});
