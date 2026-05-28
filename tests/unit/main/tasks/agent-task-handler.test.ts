import { DEFAULT_AGENT_ID } from '../../../../src/main/constants';
import { AgentTaskHandler } from '../../../../src/main/tasks/handlers/agent-task-handler';

describe('AgentTaskHandler', () => {
	function storeWithAgentService(selection = {
		provider: {
			id: ' OpenAI ',
			name: 'OpenAI',
			baseUrl: 'https://api.openai.com/v1',
		},
		model: {
			id: ' gpt-5 ',
			name: 'GPT-5',
		},
	}) {
		return {
			getAgentService: jest.fn(() => selection),
		};
	}

	it('starts an isolated agent session with configured provider settings', async () => {
		const send = jest.fn(async () => 'agent output');
		const cancel = jest.fn();
		const store = storeWithAgentService();
		const handler = new AgentTaskHandler({ send, cancel } as never, store as never);
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
			{ sessionId: 'task:task-1', providerId: 'openai', model: 'gpt-5' }
		);
		expect(store.getAgentService).toHaveBeenCalled();
		expect(updateProgress).toHaveBeenCalledWith({ message: 'Starting agent' });
		expect(updateProgress).toHaveBeenCalledWith({ message: 'Agent completed' });
	});

	it('rejects runtime overrides and secret-looking instructions', () => {
		const handler = new AgentTaskHandler(
			{ send: jest.fn(), cancel: jest.fn() } as never,
			storeWithAgentService() as never
		);

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

	it('requires store-backed agent settings before sending', async () => {
		const send = jest.fn();
		const cancel = jest.fn();
		const store = { getAgentService: jest.fn(() => undefined) };
		const handler = new AgentTaskHandler({ send, cancel } as never, store as never);
		const input = handler.validateInput({
			message: 'Run background research',
		});

		await expect(
			handler.run({
				taskId: 'task-1',
				input,
				signal: new AbortController().signal,
				updateProgress: jest.fn(),
			})
		).rejects.toThrow('Agent provider not configured.');
		expect(send).not.toHaveBeenCalled();
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
		const handler = new AgentTaskHandler(
			{ send, cancel } as never,
			storeWithAgentService() as never
		);
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
