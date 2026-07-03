import { getModelId, getProvider } from '../settings/settings_store';
import {
	addAssistantMessage,
	addToolResults,
	isExhausted,
	recordTurn,
	toResult,
	type SessionState,
} from '../session';
import { buildSystemPrompt } from '../system';
import { loadMcpTools } from '../tools/mcp_loader';
import { readTool } from '../tools/file_read';
import { writeTool } from '../tools/file_write';
import { editTool } from '../tools/file_edit';
import { applyPatchTool } from '../tools/file_apply_patch';
import { execTool } from '../tools/run_exec';
import { processTool } from '../tools/run_process';
import { webSearchTool } from '../tools/web_search';
import { webFetchTool } from '../tools/web_fetch';
import { loadSkillTool } from '../tools/skill_load';
import { searchSkillsTool } from '../tools/skill_search';
import { selectSkillTool } from '../tools/skill_select';
import { getLoopContext } from './run_common';
import { createScheduleTool } from '../tools/cron_create_schedule';
import { updateScheduleTool } from '../tools/cron_update_schedule';
import { pauseScheduleTool } from '../tools/cron_pause_schedule';
import { resumeScheduleTool } from '../tools/cron_resume_schedule';
import { deleteScheduleTool } from '../tools/cron_delete_schedule';
import { getScheduleTool } from '../tools/cron_get_schedule';
import { listSchedulesTool } from '../tools/cron_list_schedules';
import { runScheduleNowTool } from '../tools/cron_run_schedule_now';
import type { Config, RuntimeEvent, RuntimeInput, Tool } from '../types';
import { runModelTurn } from './run_model_turn';
import { runToolCalls } from './run_tool_calls';

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

	const tools: Tool[] = [
		readTool,
		writeTool,
		editTool,
		applyPatchTool,
		execTool,
		processTool,
		loadSkillTool,
		searchSkillsTool,
		selectSkillTool,
		createScheduleTool,
		updateScheduleTool,
		pauseScheduleTool,
		resumeScheduleTool,
		deleteScheduleTool,
		getScheduleTool,
		listSchedulesTool,
		runScheduleNowTool,
	];

	const mcp = await loadMcpTools();
	tools.push(...mcp.tools);

	yield {
		type: 'run_started',
		sessionId: session.id,
		model: modelId,
		providerId: provider.id,
	};

	try {
		while (true) {
			const systemPrompt = await buildSystemPrompt(config);
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
			session.skillId = getLoopContext().selectedSkill?.id;
		}
	} finally {
		await mcp.close();
	}
}
