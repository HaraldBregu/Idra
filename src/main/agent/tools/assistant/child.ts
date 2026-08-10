import { randomUUID } from 'node:crypto';
import { adoptSubagent, type AgentContext } from '../../context';
import { stream, type StreamOptions } from '../../run/run_stream';
import { createSessionState } from '../../session';
import type { Config, RuntimeInput, Tool } from '../../types';

export interface ChildRuntime
	extends Pick<StreamOptions, 'resources' | 'providerLimiter' | 'subagentLimiter'> {}

export async function runChild(
	config: Config,
	tools: Tool[],
	parent: AgentContext,
	task: string,
	instructions: string,
	signal: AbortSignal,
	runtime: ChildRuntime = {}
): Promise<string> {
	const input: RuntimeInput = {
		runId: randomUUID(),
		task: 'subagent',
		message: task,
		origin: 'subagent',
		contextMode: 'minimal',
		toolsAllow: tools.map((candidate) => candidate.name),
	};
	const session = createSessionState();
	session.messages = [{ role: 'user', content: task }];
	session.context.basePrompt = instructions;
	adoptSubagent(parent, session.context);

	let text = '';
	const events = stream(config, session, input, signal, {
		tools,
		interactive: false,
		...runtime,
	});
	for await (const event of events) {
		if (event.type === 'assistant_message') text = event.content;
		if (event.type === 'run_finished' && event.result.subtype === 'error_max_turns') {
			text = text || 'Subagent stopped: reached max iterations without a final answer.';
		}
	}
	return text;
}
