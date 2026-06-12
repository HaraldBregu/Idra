import { AgentModel } from './model';
import type {
	Provider,
	RuntimeEvent,
	RuntimeInput,
	Message,
	ToolCall,
} from '../core/types';
import type { Tool } from '../core/tool';
import { SystemPrompt } from './prompt';
import { parseToolArgs } from './args';
import { formatToolOutput } from './format';
import { Workspace } from '../core/workspace';
import { Settings } from '../core/settings';
import type { Session } from '../core/session';
import { EditTool } from '../tools/edit';
import { ExecTool } from '../tools/exec';
import { ReadTool } from '../tools/read';
import { WriteTool } from '../tools/write';

interface ModelTurn {
	content: string;
	model: string;
	stopReason?: string;
	toolCalls: Required<ToolCall>[];
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
}

interface ToolOutcome {
	output: unknown;
	isError?: boolean;
}

export class AgentRuntime {
	private readonly model: AgentModel;
	private readonly systemPrompt: SystemPrompt;

	constructor(
		private readonly workspace: Workspace,
		private readonly settings: Settings,
		private readonly session: Session
	) {
		this.model = new AgentModel();
		this.systemPrompt = new SystemPrompt();
	}

	run(input: RuntimeInput): AsyncIterable<RuntimeEvent> {
		const signal = new AbortController().signal;

		return this.stream(
			input,
			signal,
			this.session,
			this.workspace,
			this.settings
		);
	}

	private async *stream(
		input: RuntimeInput,
		signal: AbortSignal,
		session: Session,
		workspace: Workspace,
		settings: Settings
	): AsyncGenerator<RuntimeEvent> {
		const provider = settings.getProvider();
		const modelId = settings.getModelId();

		if (!provider || !modelId)
			throw new Error('Agent requires a configured provider and model.');

		const tools = input.tools ? input.tools.slice() : [];
		const workspacePath = workspace.getPath();
		tools.push(new ReadTool(workspacePath));
		tools.push(new EditTool(workspacePath));
		tools.push(new WriteTool(workspacePath));
		tools.push(new ExecTool(workspacePath));

		const system = await this.systemPrompt.build({
			workspace,
		});

		

		yield {
			type: 'run_started',
			sessionId: session.id,
			model: modelId,
			providerId: provider.id,
		};

		while (true) {
			const turn = yield* this.runModelTurn(
				input,
				provider,
				modelId,
				system,
				session.messages,
				tools,
				signal
			);

			session.recordTurn(turn);

			yield {
				type: 'assistant_message',
				content: turn.content,
				toolCalls: turn.toolCalls,
			};
			session.addAssistantMessage(turn.content, turn.toolCalls);

			if (turn.toolCalls.length === 0) {
				const result = session.toResult('success');
				yield { type: 'run_finished', result };
				return;
			}

			if (session.isExhausted) {
				const result = session.toResult('error_max_turns');
				yield { type: 'run_finished', result };
				return;
			}

			const results = yield* this.runToolCalls(tools, turn.toolCalls);
			session.addToolResults(turn.toolCalls, results);
			yield { type: 'user_message', messages: results };
		}
	}

	private async *runModelTurn(
		input: RuntimeInput,
		provider: Provider,
		modelId: string,
		system: string | undefined,
		messages: Message[],
		tools: Tool[],
		signal: AbortSignal
	): AsyncGenerator<RuntimeEvent, ModelTurn> {
		for (let attempt = 0; attempt <= (input.maxRetries ?? 1); attempt += 1) {
			let content = '';
			let model = modelId;
			let stopReason: string | undefined;
			let usage: ModelTurn['usage'];
			const pending = new Map<string, { name: string; argsText: string }>();

			try {
				for await (const event of this.model.stream({
					provider,
					model,
					system,
					messages,
					tools,
					maxTokens: input.maxTokens ?? 4096,
					signal,
				})) {
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
				if (attempt >= (input.maxRetries ?? 1)) throw error;
			}
		}

		return { content: '', model: modelId, toolCalls: [] };
	}

	private async *runToolCalls(
		tools: Tool[],
		toolCalls: Required<ToolCall>[]
	): AsyncGenerator<RuntimeEvent, Message[]> {
		const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
		const results: Message[] = [];

		for (const toolCall of toolCalls) {
			const startedAtMs = Date.now();
			yield {
				type: 'tool_call_start',
				toolCallId: toolCall.id,
				toolName: toolCall.name,
				input: toolCall.args,
			};
			const outcome = await this.runTool(toolMap.get(toolCall.name), toolCall);
			yield {
				type: 'tool_call_end',
				toolCallId: toolCall.id,
				toolName: toolCall.name,
				input: toolCall.args,
				output: outcome.output,
				isError: outcome.isError,
				durationMs: Date.now() - startedAtMs,
			};

			results.push({
				role: 'tool',
				toolUseId: toolCall.id,
				content: formatToolOutput(outcome.output),
			});
		}

		return results;
	}

	private async runTool(
		tool: Tool | undefined,
		toolCall: ToolCall
	): Promise<ToolOutcome> {
		if (!tool) {
			return { output: `Error: unknown tool '${toolCall.name}'`, isError: true };
		}

		try {
			return { output: await tool.run(toolCall.args) };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				output: `Error: tool '${toolCall.name}' failed: ${message}`,
				isError: true,
			};
		}
	}
}
