import { AgentModel } from '../model';
import { AgentRuntime } from './loop';
import type { RuntimeInput, RuntimeRun } from './types';

export type AgentOptions = Partial<Omit<RuntimeInput, 'message' | 'task'>>;

export class Agent {
	private readonly runtime: AgentRuntime;

	constructor(private readonly options: AgentOptions = {}) {
		this.runtime = new AgentRuntime(new AgentModel());
	}

	run(prompt: string, options: AgentOptions = {}): RuntimeRun {
		const provider = options.provider ?? this.options.provider ?? {
			id: process.env.FRIDAY_AGENT_PROVIDER ?? 'openai',
			apiKey: process.env.FRIDAY_AGENT_API_KEY ?? process.env.OPENAI_API_KEY ?? '',
			baseURL: process.env.FRIDAY_AGENT_BASE_URL,
		};

		return this.runtime.run({
			...this.options,
			...options,
			task: 'default',
			message: prompt,
			provider,
			model: options.model ?? this.options.model ?? process.env.FRIDAY_AGENT_MODEL ?? 'gpt-5',
		});
	}
}
