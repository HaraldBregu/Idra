import { AgentTaskHandler } from '../../../../src/main/tasks/handlers/agent-task-handler';

describe('AgentTaskHandler', () => {
	it('passes provider and model overrides into AgentService.send', async () => {
		const send = jest.fn(async () => 'agent output');
		const cancel = jest.fn();
		const handler = new AgentTaskHandler({ send, cancel } as never);
		const input = handler.validateInput({
			message: ' Summarize reports ',
			agentId: 'analyst',
			sessionId: 'task-session',
			providerId: ' Anthropic ',
			model: ' claude-test ',
		});
		const updateProgress = jest.fn();
		const controller = new AbortController();

		await expect(
			handler.run({
				taskId: 'task-1',
				input,
				signal: controller.signal,
				updateProgress,
			})
		).resolves.toEqual({ text: 'agent output' });

		expect(send).toHaveBeenCalledWith(
			'Summarize reports',
			'analyst',
			expect.objectContaining({
				sessionId: 'task-session',
				providerId: 'Anthropic',
				model: 'claude-test',
			})
		);
		expect(updateProgress).toHaveBeenCalledWith({ message: 'Starting agent' });
		expect(updateProgress).toHaveBeenCalledWith({ message: 'Agent completed' });
	});

	it('cancels the agent session when the task signal aborts', async () => {
		let rejectSend: ((error: unknown) => void) | undefined;
		const send = jest.fn(
			() =>
				new Promise<string>((_resolve, reject) => {
					rejectSend = reject;
				})
		);
		const cancel = jest.fn();
		const handler = new AgentTaskHandler({ send, cancel } as never);
		const input = handler.validateInput({
			message: 'Run background research',
			sessionId: 'task-session',
		});
		const controller = new AbortController();

		const run = handler.run({
			taskId: 'task-1',
			input,
			signal: controller.signal,
			updateProgress: jest.fn(),
		});
		controller.abort();
		rejectSend?.(new Error('cancelled'));

		await expect(run).rejects.toMatchObject({ name: 'AbortError' });
		expect(cancel).toHaveBeenCalledWith('task-session');
	});
});
