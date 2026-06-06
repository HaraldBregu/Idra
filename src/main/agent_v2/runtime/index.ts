import { AgentModel } from '../model';
import { AgentRuntime } from './loop';
import type { RuntimeInput, RuntimeModel, RuntimeRun } from './types';

export type AgentOptions = Omit<RuntimeInput, 'message' | 'task'> & {
	task?: string;
};

export class Agent {
	private readonly runtime: AgentRuntime;

	constructor(
		private readonly options: AgentOptions,
		model: RuntimeModel = new AgentModel()
	) {
		this.runtime = new AgentRuntime(model);
	}

	run(message: string, input: Partial<RuntimeInput> = {}): RuntimeRun {
		return this.runtime.run({
			...this.options,
			...input,
			task: input.task ?? this.options.task ?? message,
			message,
		});
	}
}

export { AgentRuntime } from './loop';
export type * from './types';
