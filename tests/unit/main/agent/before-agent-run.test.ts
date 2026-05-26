import {
	evaluateBeforeAgentRunHooks,
	type BeforeAgentRunEvent,
} from '../../../../src/main/agent';

const event: BeforeAgentRunEvent = {
	prompt: 'raw secret prompt',
	messages: [],
	systemPrompt: 'system',
	channelId: 'chat',
	accountId: 'account',
	senderId: 'sender',
	senderIsOwner: false,
};

describe('before_agent_run hooks', () => {
	it('passes when hooks pass or return void', async () => {
		await expect(evaluateBeforeAgentRunHooks([() => undefined, () => ({ outcome: 'pass' })], event)).resolves.toEqual({
			outcome: 'pass',
		});
	});

	it('blocks with safe replacement metadata and does not expose the internal reason', async () => {
		const result = await evaluateBeforeAgentRunHooks([
			() => ({
				outcome: 'block',
				reason: 'contains customer secret',
				message: 'I cannot process that request.',
				category: 'privacy',
				metadata: { ruleId: 'p1', prompt: event.prompt, token: 'secret' },
			}),
		], event);

		expect(result).toMatchObject({
			outcome: 'block',
			message: 'I cannot process that request.',
			metadata: {
				blockedBy: 'before_agent_run',
				category: 'privacy',
				metadata: { ruleId: 'p1' },
			},
		});
		expect(JSON.stringify(result)).not.toContain('contains customer secret');
		expect(JSON.stringify(result)).not.toContain(event.prompt);
	});

	it('fails closed on invalid output, thrown errors, and timeout', async () => {
		await expect(evaluateBeforeAgentRunHooks([() => ({ nope: true }) as never], event)).resolves.toMatchObject({
			outcome: 'block',
			metadata: { category: 'hook_invalid' },
		});
		await expect(evaluateBeforeAgentRunHooks([() => {
			throw new Error('boom');
		}], event)).resolves.toMatchObject({
			outcome: 'block',
			metadata: { category: 'hook_error' },
		});

		jest.useFakeTimers();
		try {
			const pending = evaluateBeforeAgentRunHooks([
				() => new Promise(() => undefined),
			], event, 10);
			jest.advanceTimersByTime(11);
			await expect(pending).resolves.toMatchObject({
				outcome: 'block',
				metadata: { category: 'hook_timeout' },
			});
		} finally {
			jest.useRealTimers();
		}
	});
});
