import {
	interruptPendingUserInput,
	respondUserInput,
	waitForUserInput,
	type PendingUserInput,
} from '../../../../src/main/agent/user_input/user_input_pending';

const request = (requestId: string): PendingUserInput => ({
	requestId,
	runId: 'run-1',
	toolCallId: 'tool-1',
	inputFingerprint: 'fingerprint',
	questionIds: ['choice'],
	expiresAtMs: Date.now() + 10_000,
	windowId: 7,
});

describe('user input pending registry', () => {
	afterEach(() => interruptPendingUserInput());

	it('continues the waiter only for the exact window and scope', async () => {
		const pending = request('request-1');
		const result = waitForUserInput(pending);
		const scope = {
			requestId: pending.requestId,
			runId: pending.runId,
			toolCallId: pending.toolCallId,
			inputFingerprint: pending.inputFingerprint,
		};
		const answers = [{ questionId: 'choice', answer: 'First' }];

		expect(respondUserInput(scope, answers, 8)).toBe(false);
		expect(respondUserInput({ ...scope, toolCallId: 'other' }, answers, 7)).toBe(false);
		expect(respondUserInput(scope, answers, 7)).toBe(true);
		await expect(result).resolves.toEqual(answers);
	});

	it('rejects incomplete or mismatched answers', async () => {
		const pending = request('request-2');
		const result = waitForUserInput(pending);
		const scope = {
			requestId: pending.requestId,
			runId: pending.runId,
			toolCallId: pending.toolCallId,
			inputFingerprint: pending.inputFingerprint,
		};

		expect(respondUserInput(scope, [], 7)).toBe(false);
		expect(respondUserInput(scope, [{ questionId: 'other', answer: 'No' }], 7)).toBe(false);
		interruptPendingUserInput('run-1');
		await expect(result).resolves.toBeUndefined();
	});

	it('interrupts only the selected run', async () => {
		const selected = waitForUserInput(request('selected'));
		const otherRequest = { ...request('other'), runId: 'run-2' };
		const other = waitForUserInput(otherRequest);
		interruptPendingUserInput('run-1');

		await expect(selected).resolves.toBeUndefined();
		expect(
			respondUserInput(
				{
					requestId: otherRequest.requestId,
					runId: otherRequest.runId,
					toolCallId: otherRequest.toolCallId,
					inputFingerprint: otherRequest.inputFingerprint,
				},
				[{ questionId: 'choice', answer: 'Second' }],
				7
			)
		).toBe(true);
		await expect(other).resolves.toEqual([{ questionId: 'choice', answer: 'Second' }]);
	});
});
