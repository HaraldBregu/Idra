import { act } from './act';
import { observe } from './observe';
import { perceive } from './perceive';
import type { RuntimeInput, RuntimeModel, RuntimeOutput } from './types';

export class AgentRuntime {
	constructor(private readonly model: RuntimeModel) {}

	async run(input: RuntimeInput): Promise<RuntimeOutput> {
		return observe(await act(this.model, perceive(input)));
	}
}
