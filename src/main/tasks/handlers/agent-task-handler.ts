import { DEFAULT_AGENT_ID } from '../../constants';
import type { AgentService } from '../../service';
import type { StoreService } from '../../store';
import type { TaskContext, TaskHandler } from '../../../shared/tasks';

export const AGENT_TASK_TYPE = 'agent.run';

export interface AgentTaskInput {
	message: string;
}

export interface AgentTaskResult {
	text: string;
}

const ALLOWED_INPUT_KEYS = new Set(['message']);
const SECRET_VALUE_PATTERN =
	/authorization\s*:\s*bearer\s+\S+|(?:api[_-]?key|credential|password|secret|token)\s*[:=]\s*\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----/i;
type AgentTaskAgentService = Pick<AgentService, 'send' | 'cancel'>;
type AgentTaskStore = Pick<StoreService, 'getAgentService'>;

function abortError(): Error {
	const error = new Error('Task was cancelled.');
	error.name = 'AbortError';
	return error;
}

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error('Agent task input must be an object.');
	}
}

function assertOnlyAgentInstruction(input: Record<string, unknown>): void {
	for (const key of Object.keys(input)) {
		if (!ALLOWED_INPUT_KEYS.has(key)) {
			throw new Error(`${key} is not allowed in agent task input.`);
		}
	}
}

export class AgentTaskHandler implements TaskHandler<AgentTaskInput, AgentTaskResult> {
	readonly type = AGENT_TASK_TYPE;

	constructor(
		private readonly agentService: AgentTaskAgentService,
		private readonly store: AgentTaskStore
	) {}

	validateInput(input: unknown): AgentTaskInput {
		assertRecord(input);
		assertOnlyAgentInstruction(input);
		if (typeof input.message !== 'string') {
			throw new Error('message is required.');
		}
		const message = input.message.trim();
		if (!message) throw new Error('message is required.');
		if (message.length > 200_000) throw new Error('message is too long.');
		if (SECRET_VALUE_PATTERN.test(message)) {
			throw new Error('message contains secret-looking content.');
		}

		return {
			message,
		};
	}

	async run(context: TaskContext<AgentTaskInput>): Promise<AgentTaskResult> {
		if (context.signal.aborted) throw abortError();

		const input = context.input;
		const sessionId = `task:${context.taskId}`;
		const runSettings = this.resolveRunSettings();

		const cancelAgent = (): void => {
			this.agentService.cancel(sessionId);
		};

		context.updateProgress({ message: 'Starting agent' });
		context.signal.addEventListener('abort', cancelAgent, { once: true });
		try {
			const text = await this.agentService.send(input.message, DEFAULT_AGENT_ID, {
				sessionId,
				providerId: runSettings.providerId,
				model: runSettings.model,
			});
			if (context.signal.aborted) throw abortError();
			context.updateProgress({ message: 'Agent completed' });
			return { text };
		} catch (error) {
			if (context.signal.aborted) throw abortError();
			throw error;
		} finally {
			context.signal.removeEventListener('abort', cancelAgent);
		}
	}

	private resolveRunSettings(): { providerId: string; model: string } {
		const selection = this.store.getAgentService();
		const providerId = selection?.provider.id.trim().toLowerCase() ?? '';
		const model = selection?.model.id.trim() || selection?.model.name.trim() || '';
		if (!providerId) throw new Error('Agent provider not configured.');
		if (!model) throw new Error('Agent model not configured.');
		return { providerId, model };
	}
}
