import { AgentModel } from '../../llm';
import type {
	Provider,
	RuntimeEvent,
	RuntimeInput,
	Message,
	MessageContentBlock,
	ToolCall,
} from '../core/types';
import type { Tool } from '../core/tool';
import type { Cron } from '../core/cron';
import type { Config } from '../core/config';
import { parseToolArgs } from '../shared/args';
import { runToolCall } from './tool-run';
import { Store } from '../core/store';
import { Session } from '../core/session';
import { ToolLoader } from '../tools/loader';
import { loadMcpTools } from '../tools/mcp/loader';
import { ToolContext } from '../tools/context';
import { System } from '../core/system';
import { Skills } from '../core/skills';

interface ModelTurn {
	content: string;
	model: string;
	stopReason?: string;
	toolCalls: ToolCall[];
	usage?: {
		inputTokens?: number;
		outputTokens?: number;
	};
	providerItems?: MessageContentBlock[];
}

export class AgentRuntime {
	private readonly model = new AgentModel();

	constructor(
		private readonly cron: Cron,
		private readonly config: Config
	) {}

	async *run(input: RuntimeInput): AsyncGenerator<RuntimeEvent> {
		const signal = new AbortController().signal;
		const session = new Session(input, input.category);
		const settings = new Store();

		try {
			for await (const event of this.stream(input, signal, session, settings)) {
				session.appendRun(event);
				yield event;
			}
		} catch (error) {
			session.appendRun({
				type: 'run_error',
				message: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	private async *stream(
		input: RuntimeInput,
		signal: AbortSignal,
		session: Session,
		settings: Store
	): AsyncGenerator<RuntimeEvent> {
		const provider = settings.getProvider();
		const modelId = settings.getModelId();

		if (!provider || !modelId)
			throw new Error('Agent requires a configured provider and model.');

		const toolContext = new ToolContext();
		const tools = input.tools ? input.tools.slice() : [];

		const toolLoader = new ToolLoader(toolContext, this.cron, new Skills());
		tools.push(...toolLoader.tools);

		const mcp = await loadMcpTools(toolContext);
		tools.push(...mcp.tools);

		const system = new System(new Skills());
		await system.addBasePrompt();
		await system.addWorkspacePrompt();
		await system.addSkillsPrompt();
		const systemPrompt = system.prompt;

		yield {
			type: 'run_started',
			sessionId: session.id,
			model: modelId,
			providerId: provider.id,
		};

		try {
			while (true) {
				const turn = yield* this.runModelTurn(
					input,
					provider,
					modelId,
					systemPrompt,
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
				session.addAssistantMessage(turn.content, turn.toolCalls, turn.providerItems);

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

				yield* this.runToolCalls(tools, turn.toolCalls);
				session.addToolResults(turn.toolCalls);
			}
		} finally {
			await mcp.close();
		}
	}

	private async *runModelTurn(
		input: RuntimeInput,
		provider: Provider,
		modelId: string,
		systemPrompt: string | undefined,
		messages: Message[],
		tools: Tool[],
		signal: AbortSignal
	): AsyncGenerator<RuntimeEvent, ModelTurn> {
		for (let attempt = 0; attempt <= (input.maxRetries ?? 1); attempt += 1) {
			let content = '';
			let model = modelId;
			let stopReason: string | undefined;
			let usage: ModelTurn['usage'];
			const providerItems: MessageContentBlock[] = [];
			const pending = new Map<string, { name: string; argsText: string }>();

			try {
				for await (const event of this.model.stream({
					provider,
					model,
					effort: input.effort,
					systemPrompt,
					messages,
					tools,
					maxTokens: input.maxTokens ?? 4096,
					signal,
				})) {
					if (event.type === 'model_call_delta') content += event.delta;
					if (event.type === 'model_provider_item') {
						providerItems.push({
							type: 'provider_item',
							provider: event.provider,
							item: event.item,
						});
					}
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
					providerItems,
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
		toolCalls: ToolCall[]
	): AsyncGenerator<RuntimeEvent, void> {
		const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

		for (const toolCall of toolCalls) {
			yield* runToolCall(toolMap.get(toolCall.name), toolCall);
		}
	}
}
