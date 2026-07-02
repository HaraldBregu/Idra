import type { Config, RuntimeEvent, RuntimeInput, Tool } from '../types';
import { getModelId, getProvider } from '../settings/settings_store';
import {
	addAssistantMessage,
	addToolResults,
	isExhausted,
	recordTurn,
	toResult,
	type SessionState,
} from '../session';
import { loadTools } from '../tools/loader';
import { loadMcpTools } from '../tools/mcp/loader';
import { buildSystemPrompt } from '../system';
import { runModelTurn } from './loop_run_model_turn';
import { runToolCalls } from './loop_run_tool_calls';

export async function* stream(
	config: Config,
	session: SessionState,
	input: RuntimeInput,
	signal: AbortSignal,
): AsyncGenerator<RuntimeEvent> {
	const provider = getProvider();
	const modelId = getModelId();

	if (!provider || !modelId)
		throw new Error('Agent requires a configured provider and model.');

	const tools: Tool[] = [];

	tools.push(...loadTools());

	const mcp = await loadMcpTools();
	tools.push(...mcp.tools);

	const systemPrompt = await buildSystemPrompt(config);

	yield {
		type: 'run_started',
		sessionId: session.id,
		model: modelId,
		providerId: provider.id,
	};

	try {
		while (true) {
			const turn = yield* runModelTurn(
				input,
				provider,
				modelId,
				systemPrompt,
				session.messages,
				tools,
				signal,
			);

			recordTurn(session, turn);

			yield {
				type: 'assistant_message',
				content: turn.content,
				toolCalls: turn.toolCalls,
			};
			addAssistantMessage(session, turn.content, turn.toolCalls, turn.providerItems);

			if (turn.toolCalls.length === 0) {
				const result = toResult(session, 'success');
				yield { type: 'run_finished', result };
				return;
			}

			if (isExhausted(session)) {
				const result = toResult(session, 'error_max_turns');
				yield { type: 'run_finished', result };
				return;
			}

			yield* runToolCalls(tools, turn.toolCalls);
			addToolResults(session, turn.toolCalls);
		}
	} finally {
		await mcp.close();
	}
}
