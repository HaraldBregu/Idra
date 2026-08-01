import { getResolvedProvider } from '../../app/settings_store';
import { getModelId, getProviderId } from '../agent_store';
import {
	addAssistantMessage,
	addToolResults,
	appendRun,
	isExhausted,
	modelMessages,
	persistSystemPrompt,
	recordTurn,
	toResult,
	type SessionState,
} from '../session';
import { rememberSkill } from '../context';
import { buildSkillContext, buildSystemPrompt, buildWorkspaceContext } from '../system';
import { loadMcpTools } from '../tools/mcp/loader';
import { completeBootstrapTool } from '../tools/bootstrap_complete';
import { readTool } from '../tools/file/read';
import { writeTool } from '../tools/file/write';
import { editTool } from '../tools/file/edit';
import { applyPatchTool } from '../tools/file/apply_patch';
import { execTool } from '../tools/run_exec';
import { processTool } from '../tools/run_process';
import { getWebSearchTools } from '../tools/search/search';
import { webFetchTool } from '../tools/web/fetch';
import { webBrowserTool } from '../tools/web/browser';
import { createImageTool } from '../tools/media/image_create';
import { createVideoTool } from '../tools/media/video_create';
import { createSoundTool } from '../tools/media/sound_create';
import { recorderMicrophoneTool } from '../tools/system/recorder_microphone';
import { recorderMicrophoneStatusTool } from '../tools/system/recorder_microphone_status';
import { recorderCameraTool } from '../tools/system/recorder_camera';
import { recorderCameraStatusTool } from '../tools/system/recorder_camera_status';
import { recorderScreenTool } from '../tools/system/recorder_screen';
import { recorderScreenStatusTool } from '../tools/system/recorder_screen_status';
import { saveMemoryTool } from '../tools/memory/save';
import { forgetMemoryTool } from '../tools/memory/forget';
import { updateHealthTool } from '../tools/health_update';
import { updateHealthSettingsTool } from '../tools/health_settings_update';
import { loadSkillTool } from '../tools/skill_load';
import { createScheduleTool } from '../tools/cron/create_schedule';
import { updateScheduleTool } from '../tools/cron/update_schedule';
import { pauseScheduleTool } from '../tools/cron/pause_schedule';
import { resumeScheduleTool } from '../tools/cron/resume_schedule';
import { deleteScheduleTool } from '../tools/cron/delete_schedule';
import { getScheduleTool } from '../tools/cron/get_schedule';
import { listSchedulesTool } from '../tools/cron/list_schedules';
import { runScheduleNowTool } from '../tools/cron/run_schedule_now';
import { subagentTool } from '../tools/subagent';
import type { Config, RuntimeEvent, RuntimeInput, Tool } from '../types';
import { runModelTurn } from './run_model_turn';
import { runToolCalls } from './run_tool_calls';

export interface StreamOptions {
	tools?: Tool[];
	interactive?: boolean;
}

export async function* stream(
	config: Config,
	session: SessionState,
	input: RuntimeInput,
	signal: AbortSignal,
	options: StreamOptions = {}
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
	options: StreamOptions
): AsyncGenerator<RuntimeEvent> {
	const provider = getResolvedProvider(input.providerId ?? getProviderId());
	const modelId = input.model ?? getModelId();

	if (!provider || !modelId) throw new Error('Agent requires a configured provider and model.');

	const interactive = options.interactive ?? true;
	const tools: Tool[] = options.tools
		? [...options.tools]
		: [
				readTool,
				writeTool,
				editTool,
				applyPatchTool,
				execTool,
				processTool,
				...getWebSearchTools(),
				webFetchTool,
				webBrowserTool,
				createImageTool(),
				createVideoTool(),
				createSoundTool(),
				recorderMicrophoneTool(),
				recorderMicrophoneStatusTool,
				recorderCameraTool(),
				recorderCameraStatusTool,
				recorderScreenTool(),
				recorderScreenStatusTool,
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
		tools.push(subagentTool(config, [...tools], session.context));
		closeMcp = mcp.close;
	}

	session.context.skill = undefined;
	session.context.loadedSkills = undefined;
	session.context.subagents = undefined;
	session.context.toolsContext = {};

	yield {
		type: 'run_started',
		sessionId: session.id,
		model: modelId,
		providerId: provider.id,
		tools: tools.map((tool) => tool.name),
	};

	try {
		while (true) {
			if (signal.aborted) return;
			session.context.systemPrompt = await buildSystemPrompt(
				config,
				tools,
				session.context.loadedSkills,
				session.context.basePrompt
			);
			persistSystemPrompt(session, session.context.systemPrompt);
			const workspaceContext =
				session.context.basePrompt === undefined ? await buildWorkspaceContext(config) : '';
			const skillContext = buildSkillContext();
			const runtimeContext = [workspaceContext, skillContext].filter(Boolean).join('\n\n');
			const messages = modelMessages(session.messages);
			const turn = yield* runModelTurn(
				input,
				provider,
				modelId,
				session.context.systemPrompt,
				runtimeContext
					? [{ role: 'user', content: runtimeContext }, ...messages]
					: messages,
				tools,
				signal
			);

			recordTurn(session, turn);

			yield {
				type: 'assistant_message',
				content: turn.content,
				toolCalls: turn.toolCalls,
			};
			addAssistantMessage(session, turn.content, turn.toolCalls, turn.providerItems, {
				inputTokens: turn.usage?.inputTokens ?? 0,
				outputTokens: turn.usage?.outputTokens ?? 0,
			});

			if (turn.toolCalls.length === 0) {
				const result = toResult(session, 'success');
				yield { type: 'run_finished', result };
				return;
			}

			if (isExhausted(session)) {
				session.stopReason = 'max_iterations';
				const result = toResult(session, 'error_max_turns');
				yield { type: 'run_finished', result };
				return;
			}

			for await (const event of runToolCalls(
				tools,
				turn.toolCalls,
				interactive,
				signal,
				session.context.toolsContext
			)) {
				yield event;
				if (event.type !== 'tool_call_end') continue;
				if (event.toolName !== loadSkillTool.name) continue;
				const output = event.output as { skill?: unknown; content?: unknown } | undefined;
				const skill = output?.skill;
				if (typeof skill !== 'string') continue;
				session.context.skill = skill;
				if (typeof output?.content === 'string')
					rememberSkill(session.context, skill, output.content);
			}
			addToolResults(session, turn.toolCalls);

			if (session.context.toolsContext.cancelled) {
				session.stopReason = 'cancelled';
				const result = toResult(session, 'success');
				yield { type: 'run_finished', result };
				return;
			}
		}
	} finally {
		await closeMcp?.();
	}
}
