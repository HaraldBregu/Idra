import { AgentTaskHandler } from '../../../../src/main/tasks/handlers/agent-task-handler';

describe('AgentTaskHandler', () => {
	it('passes provider and model overrides into AgentService.send', async () => {
		const send = jest.fn(async () => 'agent output');
		const cancel = jest.fn();
		const handler = new AgentTaskHandler({ send, cancel } as never);
		const input = handler.validateInput({
			message: 'Summarize reports',
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
});
