import { AgentModel } from '../model';
import type {
	RuntimeEvent,
	RuntimeInput,
	RuntimeMessage,
	RuntimeModel,
	RuntimeModelProvider,
	RuntimeRun,
	RuntimeTool,
	RuntimeToolCall,
} from './types';
import { RuntimeSession } from '../session/session';
import { Settings } from '../settings/settings';
import { SystemPrompt } from '../prompt/prompt';
import { Workspace } from '../workspace/workspace';
import { parseToolArgs } from './args';
import { formatToolOutput } from './format';
import { runTool } from './tool';

interface ModelTurn {
	content: string;
	model: string;
	stopReason?: string;
	toolCalls: Required<RuntimeToolCall>[];
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
}

async function* runModelTurn(
	modelPort: RuntimeModel,
	input: RuntimeInput,
	provider: RuntimeModelProvider,
	system: string | undefined,
	messages: RuntimeMessage[],
	signal: AbortSignal,
	isStopped: () => boolean
): AsyncGenerator<RuntimeEvent, ModelTurn | null> {
	for (let attempt = 0; attempt <= (input.maxRetries ?? 1); attempt += 1) {
		let content = '';
		let model = input.model ?? 'default';
		let stopReason: string | undefined;
		let usage: ModelTurn['usage'];
		const pending = new Map<string, { name: string; argsText: string }>();

		try {
			for await (const event of modelPort.stream({
				provider,
				model,
				system,
				messages,
				tools: input.tools ?? [],
				maxTokens: input.maxTokens ?? 4096,
				signal,
			})) {
				if (isStopped()) return null;
				if (event.type === 'model_call_delta') content += event.delta;
				if (event.type === 'model_tool_call_start') {
					pending.set(event.id, { name: event.name, argsText: '' });
				}
				if (event.type === 'model_tool_call_args_delta') {
					const toolCall = pending.get(event.id);
					if (toolCall) toolCall.argsText += event.jsonDelta;
				}
				if (event.type === 'model_call_end') {
					model = event.model;
					stopReason = event.stopReason;
					usage = event.usage;
				}
				yield event;
			}

			return {
				content,
				model,
				stopReason,
				usage,
				toolCalls: [...pending].map(([id, toolCall]) => ({
					id,
					name: toolCall.name,
					args: parseToolArgs(toolCall.argsText),
				})),
			};
		} catch (error) {
			if (isStopped()) return null;
			if (attempt >= (input.maxRetries ?? 1)) throw error;
		}
	}

	return { content: '', model: input.model ?? 'default', toolCalls: [] };
}

export class AgentRuntime {
	constructor(
		private readonly workspace = new Workspace(),
		private readonly settings = new Settings(workspace),
		private readonly model: RuntimeModel = new AgentModel(),
		private readonly systemPrompt = new SystemPrompt(workspace)
	) {}

	run(input: RuntimeInput): RuntimeRun {
		const provider = input.provider ?? this.settings.getProvider();
		const model = input.model ?? this.settings.getModel();

		if (!provider || !model)
			throw new Error('Agent v2 requires a configured provider and model.');
		if (
			input.providerId &&
			provider.id.trim().toLowerCase() !== input.providerId.trim().toLowerCase()
		)
			throw new Error(`Agent v2 provider is not configured: ${input.providerId}`);

		const resolved: RuntimeInput = { ...input, provider, model };
		const controller = new AbortController();
		let stopped = false;
		let stopReason = 'stopped';

		input.signal?.addEventListener(
			'abort',
			() => {
				stopped = true;
				controller.abort();
			},
			{ once: true }
		);

		return {
			stream: this.stream(resolved, provider, controller.signal, () => stopped, () => stopReason),
			stop(reason = 'stopped'): void {
				stopped = true;
				stopReason = reason;
				controller.abort();
			},
		};
	}

	private async *stream(
		input: RuntimeInput,
		provider: RuntimeModelProvider,
		signal: AbortSignal,
		isStopped: () => boolean,
		getStopReason: () => string
	): AsyncGenerator<RuntimeEvent> {
		const session = new RuntimeSession(input);
		const system = input.system ?? (await this.systemPrompt.build());

		yield {
			type: 'run_started',
			sessionId: session.id,
			model: session.model,
			providerId: provider.id,
		};

		while (true) {
			if (isStopped()) {
				yield { type: 'run_stopped', reason: getStopReason() };
				return;
			}

			const turn = yield* runModelTurn(this.model, input, provider, system, session.messages, signal, isStopped);
			if (turn === null) {
				yield { type: 'run_stopped', reason: getStopReason() };
				return;
			}

			session.recordTurn(turn);

			yield {
				type: 'assistant_message',
				content: turn.content,
				toolCalls: turn.toolCalls,
			};
			session.addAssistantMessage(turn.content, turn.toolCalls);

			if (turn.toolCalls.length === 0) {
				yield { type: 'run_finished', result: session.toResult('success') };
				return;
			}

			if (session.isExhausted) {
				yield { type: 'run_finished', result: session.toResult('error_max_turns') };
				return;
			}

			const results = yield* runToolCalls(input.tools ?? [], turn.toolCalls, isStopped);
			if (results === null) {
				yield { type: 'run_stopped', reason: getStopReason() };
				return;
			}
			session.addToolResults(turn.toolCalls, results);
			yield { type: 'user_message', messages: results };
		}
	}
}

async function* runToolCalls(
	tools: RuntimeTool[],
	toolCalls: Required<RuntimeToolCall>[],
	isStopped: () => boolean
): AsyncGenerator<RuntimeEvent, RuntimeMessage[] | null> {
	const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
	const results: RuntimeMessage[] = [];

	for (const toolCall of toolCalls) {
		if (isStopped()) return null;

		yield { type: 'tool_call_start', toolName: toolCall.name, input: toolCall.args };
		const outcome = await runTool(toolMap.get(toolCall.name), toolCall);
		yield { type: 'tool_call_end', toolName: toolCall.name, output: outcome.output };

		results.push({
			role: 'tool',
			toolUseId: toolCall.id,
			content: formatToolOutput(outcome.output),
		});
	}

	return results;
}