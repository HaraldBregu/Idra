import { getModelId, getProvider } from '../settings/settings_store';
import {
	addAssistantMessage,
	addToolResults,
	appendRun,
	isExhausted,
	persistSystemPrompt,
	recordTurn,
	toResult,
	type SessionState,
} from '../session';
import { rememberSkill } from '../context';
import { addFilesystemPrompt, buildSystemPrompt } from '../system';
import { loadMcpTools } from '../tools/mcp_loader';
import { completeBootstrapTool } from '../tools/bootstrap_complete';
import { readTool } from '../tools/file_read';
import { writeTool } from '../tools/file_write';
import { editTool } from '../tools/file_edit';
import { applyPatchTool } from '../tools/file_apply_patch';
import { execTool } from '../tools/run_exec';
import { processTool } from '../tools/run_process';
import { getWebSearchTools } from '../tools/web_search';
import { webFetchTool } from '../tools/web_fetch';
import { webBrowserTool } from '../tools/web_browser';
import { createImageTool } from '../tools/image_create';
import { createVideoTool } from '../tools/video_create';
import { createSoundTool } from '../tools/sound_create';
import { saveMemoryTool } from '../tools/memory_save';
import { forgetMemoryTool } from '../tools/memory_forget';
import { updateHealthTool } from '../tools/health_update';
import { updateHealthSettingsTool } from '../tools/health_settings_update';
import { loadSkillTool } from '../tools/skill_load';
import { createScheduleTool } from '../tools/cron_create_schedule';
import { updateScheduleTool } from '../tools/cron_update_schedule';
import { pauseScheduleTool } from '../tools/cron_pause_schedule';
import { resumeScheduleTool } from '../tools/cron_resume_schedule';
import { deleteScheduleTool } from '../tools/cron_delete_schedule';
import { getScheduleTool } from '../tools/cron_get_schedule';
import { listSchedulesTool } from '../tools/cron_list_schedules';
import { runScheduleNowTool } from '../tools/cron_run_schedule_now';
import { subagentTool } from '../tools/subagent';
import { addGoalPrompt, completeGoalTool, loadGoal } from '../goal';
import type { Config, RuntimeEvent, RuntimeInput, Tool } from '../types';
import { runModelTurn } from './run_model_turn';
import { runToolCalls } from './run_tool_calls';

export interface StreamOptions {
	systemPrompt?: string;
	tools?: Tool[];
	interactive?: boolean;
}

export async function* stream(
	config: Config,
	session: SessionState,
	input: RuntimeInput,
	signal: AbortSignal,
	options: StreamOptions = {},
): AsyncGenerator<RuntimeEvent> {
	try {
		for await (const event of loop(config, session, input, signal, options)) {
			appendRun(session, event);
			yield event;
		}
	} catch (error) {
		appendRun(session, {
			type: 'run_error',
			message: error instanceof Error ? error.message : String(error),
		});
		throw error;
	}
}

async function* loop(
	config: Config,
	session: SessionState,
	input: RuntimeInput,
	signal: AbortSignal,
	options: StreamOptions,
): AsyncGenerator<RuntimeEvent> {
	const provider = getProvider(input.providerId);
	const modelId = input.model ?? getModelId();

	if (!provider || !modelId)
		throw new Error('Agent requires a configured provider and model.');

	const interactive = options.interactive ?? true;
	const tools: Tool[] = options.tools ?? [
		readTool,
		writeTool,
		editTool,
		applyPatchTool,
		execTool,
		processTool,
		...getWebSearchTools(),
		webFetchTool,
		webBrowserTool,
		createImageTool(config.location),
		createVideoTool(config.location),
		createSoundTool(config.location),
		saveMemoryTool(config),
		forgetMemoryTool(config),
		updateHealthTool(config),
		updateHealthSettingsTool,
		loadSkillTool,
		createScheduleTool,
		updateScheduleTool,
		pauseScheduleTool,
		resumeScheduleTool,
		deleteScheduleTool,
		getScheduleTool,
		listSchedulesTool,
		runScheduleNowTool,
		completeBootstrapTool,
	];

	let closeMcp: (() => Promise<void>) | undefined;
	if (!options.tools) {
		const mcp = await loadMcpTools();
		tools.push(...mcp.tools);
		tools.push(subagentTool(config, [...tools]));
		closeMcp = mcp.close;
	}
	if (loadGoal(session)?.status === 'active') tools.push(completeGoalTool(session));

	session.context.skill = undefined;
	session.context.loadedSkills = undefined;

	yield {
		type: 'run_started',
		sessionId: session.id,
		model: modelId,
		providerId: provider.id,
	};

	let firstTurn = true;
	try {
		while (true) {
			if (signal.aborted) return;
			const baseSystemPrompt = options.systemPrompt === undefined
				? await buildSystemPrompt(config, tools, session.context.loadedSkills)
				: await addFilesystemPrompt(config, options.systemPrompt);
			const systemPrompt = addGoalPrompt(baseSystemPrompt, loadGoal(session));
			persistSystemPrompt(session, systemPrompt, firstTurn);
			firstTurn = false;
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

			for await (const event of runToolCalls(tools, turn.toolCalls, interactive)) {
				yield event;
				if (event.type !== 'tool_call_end' || event.toolName !== loadSkillTool.name) continue;
				const output = event.output as { skill?: unknown; content?: unknown } | undefined;
				const skill = output?.skill;
				if (typeof skill !== 'string') continue;
				session.context.skill = skill;
				if (typeof output?.content === 'string')
					rememberSkill(session.context, skill, output.content);
			}
			addToolResults(session, turn.toolCalls);
		}
	} finally {
		await closeMcp?.();
	}
}
