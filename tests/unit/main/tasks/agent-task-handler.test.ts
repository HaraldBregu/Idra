import { DEFAULT_AGENT_ID } from '../../../../src/main/constants';
import { AgentTaskHandler } from '../../../../src/main/tasks/handlers/agent-task-handler';

describe('AgentTaskHandler', () => {
	it('starts an isolated agent session with configured provider settings', async () => {
		const send = jest.fn(async () => 'agent output');
		const cancel = jest.fn();
		const handler = new AgentTaskHandler({ send, cancel } as never);
		const input = handler.validateInput({
			message: ' Summarize reports ',
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
			DEFAULT_AGENT_ID,
			{ sessionId: 'task:task-1' }
		);
		expect(updateProgress).toHaveBeenCalledWith({ message: 'Starting agent' });
		expect(updateProgress).toHaveBeenCalledWith({ message: 'Agent completed' });
	});

	it('rejects runtime overrides and secret-looking instructions', () => {
		const handler = new AgentTaskHandler({ send: jest.fn(), cancel: jest.fn() } as never);

		expect(() =>
			handler.validateInput({
				message: 'Run background research',
				providerId: 'openai',
			})
		).toThrow(/providerId is not allowed/);
		expect(() =>
			handler.validateInput({
				message: 'Authorization: Bearer secret-token',
			})
		).toThrow(/secret-looking/);
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
		expect(cancel).toHaveBeenCalledWith('task:task-1');
	});
});
