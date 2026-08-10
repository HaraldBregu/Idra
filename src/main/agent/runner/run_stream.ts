import { getResolvedProvider } from '../../settings_store';
import { getModelId, getModelOptions, getProviderId } from '../agent_store';
import {
	addAssistantMessage,
	addToolResults,
	isExhausted,
	recordTurn,
	tryAppendRun,
	toResult,
	type SessionState,
} from '../session';
import { rememberSkill, type LoadedSkill } from '../context';
import {
	buildLoadedSkillPrompt,
	buildSkillContext,
	buildSystemPrompt,
	buildWorkspaceContext,
} from '../system';
import { loadMcpTools } from '../tools/mcp/loader';
import { completeBootstrapTool } from '../tools/assistant/complete_bootstrap';
import { readTool } from '../tools/core/read_file';
import { writeTool } from '../tools/core/write_file';
import { editTool } from '../tools/core/edit_file';
import { applyPatchTool } from '../tools/core/apply_patch';
import { execTool } from '../tools/core/exec_command';
import { processTool } from '../tools/core/process';
import { getWebSearchTools } from '../tools/web/search';
import { webFetchTool } from '../tools/web/fetch';
import { webBrowserTool } from '../tools/web/browser';
import { createImageTool } from '../tools/media/image_create';
import { createVideoTool } from '../tools/media/video_create';
import { createSoundTool } from '../tools/media/sound_create';
import { microphoneRecorderTool } from '../tools/system/microphone_recorder';
import { microphoneRecorderStatusTool } from '../tools/system/microphone_recorder_status';
import { microphoneRecorderStopTool } from '../tools/system/microphone_recorder_stop';
import { cameraRecorderTool } from '../tools/system/camera_recorder';
import { cameraRecorderStatusTool } from '../tools/system/camera_recorder_status';
import { cameraRecorderStopTool } from '../tools/system/camera_recorder_stop';
import { screenRecorderTool } from '../tools/system/screen_recorder';
import { screenRecorderStatusTool } from '../tools/system/screen_recorder_status';
import { screenRecorderStopTool } from '../tools/system/screen_recorder_stop';
import { saveMemoryTool } from '../tools/memory/save';
import { forgetMemoryTool } from '../tools/memory/forget';
import { memoryListTool } from '../tools/memory/list';
import { getKnowledgeTools, getWikiTools } from '../tools/knowledge';
import { updateHealthCheckTool } from '../tools/health_check/health_check_update';
import { updateHealthCheckSettingsTool } from '../tools/health_check/health_check_settings_update';
import { loadSkillTool } from '../tools/skills/load_skill';
import { createTaskTool } from '../tools/tasks/create_task';
import { updateTaskTool } from '../tools/tasks/update_task';
import { pauseTaskTool } from '../tools/tasks/pause_task';
import { resumeTaskTool } from '../tools/tasks/resume_task';
import { deleteTaskTool } from '../tools/tasks/delete_task';
import { getTaskTool } from '../tools/tasks/get_task';
import { listTasksTool } from '../tools/tasks/list_tasks';
import { runTaskNowTool } from '../tools/tasks/run_task_now';
import { subagentTool, subagentsTool } from '../tools/core/subagents';
import { listExtensionsTool } from '../tools/extensions/list_extensions';
import { openExtensionsTool } from '../tools/extensions/open_extensions';
import type { AgentPermissionMode } from '../../../shared/agent_types';
import type { Config, McpDiscoveryDiagnostics, RuntimeEvent, RuntimeInput, Tool } from '../types';
import type { WindowFactory } from '../../window_factory';
import { runModelTurn } from './run_model_turn';
import { runToolCalls } from './run_tool_calls';
import { getPermissionMode } from '../permissions';
import { selectOriginTools } from './run_origin_tools';
import { formatToolOutput } from './run_common';
import { selectSkillTools } from './run_skill_tools';
import { hasPrivateInput } from './run_has_private_input';
import { activateSkill, createSkillRegistrySnapshot } from '../skills';
import type { SkillLoadResult } from '../../../shared/skills_types';
import type { PermissionsSchema } from '../permissions';
import type { KeyedLimiter } from '../limiter';
import type { KeyedMutex } from '../mutex';

export interface StreamOptions {
	tools?: Tool[];
	interactive?: boolean;
	streaming?: boolean;
	permissions?: PermissionsSchema;
	windowFactory?: WindowFactory;
	resources?: KeyedMutex;
	providerLimiter?: KeyedLimiter;
	subagentLimiter?: KeyedLimiter;
}

const MAX_TOOL_CALLS = 100;
const MAX_TOOL_OUTPUT_BYTES = 2_000_000;
const MAX_PAID_TOOL_CALLS = 3;
const MAX_BOT_WEB_TOOL_CALLS = 8;

export async function* stream(
	config: Config,
	session: SessionState,
	input: RuntimeInput,
	signal: AbortSignal,
	options: StreamOptions = {}
): AsyncGenerator<RuntimeEvent> {
	let terminal = false;
	try {
		for await (const event of loop(config, session, input, signal, options)) {
			tryAppendRun(session, event);
			yield event;
			if (event.type === 'run_finished') terminal = true;
		}
	} catch (error) {
		const errorEvent = {
			type: 'run_error',
			message: error instanceof Error ? error.message : String(error),
		} as const;
		tryAppendRun(session, errorEvent);
		yield errorEvent;
		if (!terminal) {
			session.stopReason = signal.aborted
				? signal.reason instanceof DOMException && signal.reason.name === 'TimeoutError'
					? 'timeout'
					: 'cancelled'
				: 'error';
			const event = { type: 'run_finished', result: toResult(session, 'success') } as const;
			tryAppendRun(session, event);
			yield event;
			terminal = true;
		}
		if (!signal.aborted) throw error;
		return;
	}
	if (!terminal) {
		session.stopReason = signal.aborted
			? signal.reason instanceof DOMException && signal.reason.name === 'TimeoutError'
				? 'timeout'
				: 'cancelled'
			: 'error';
		const event = { type: 'run_finished', result: toResult(session, 'success') } as const;
		tryAppendRun(session, event);
		yield event;
		terminal = true;
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
	const modelOptions = getModelOptions();
	const origin = input.origin ?? session.category ?? 'main';
	const contextMode = input.contextMode ?? (origin === 'main' ? 'workspace' : 'minimal');
	const runId = input.runId ?? session.id;
	const skillSnapshot =
		origin === 'main' ? createSkillRegistrySnapshot() : { skills: [], diagnostics: [] };

	if (!provider || !modelId) throw new Error('Agent requires a configured provider and model.');

	const interactive = options.interactive ?? true;
	const permissionMode: AgentPermissionMode =
		options.permissions?.mode ?? (!interactive ? 'ask' : getPermissionMode());
	session.context.skill = undefined;
	session.context.loadedSkills = undefined;
	session.context.subagents = undefined;
	session.context.toolsContext = {
		...(hasPrivateInput(session.messages) ? { hasPrivateContext: true } : {}),
	};

	let tools: Tool[] = options.tools
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
				microphoneRecorderTool(),
				microphoneRecorderStatusTool,
				microphoneRecorderStopTool,
				cameraRecorderTool(),
				cameraRecorderStatusTool,
				cameraRecorderStopTool,
				screenRecorderTool(),
				screenRecorderStatusTool,
				screenRecorderStopTool,
				saveMemoryTool(config),
				forgetMemoryTool(config),
				memoryListTool(config),
				...getKnowledgeTools(origin),
				...getWikiTools(origin),
				updateHealthCheckTool(config),
				updateHealthCheckSettingsTool,
				createTaskTool,
				updateTaskTool,
				pauseTaskTool,
				resumeTaskTool,
				deleteTaskTool,
				getTaskTool,
				listTasksTool,
				runTaskNowTool,
				listExtensionsTool,
				...(options.windowFactory ? [openExtensionsTool(options.windowFactory)] : []),
				completeBootstrapTool,
			];
	const applyActivatedSkill = (skill: SkillLoadResult): void => {
		session.context.skill = skill.name;
		rememberSkill(session.context, {
			id: skill.id,
			name: skill.name,
			canonicalRoot: skill.canonicalRoot,
			instructions: skill.instructions,
			source: skill.source,
			trust: 'user-controlled',
			hash: skill.hash,
			allowedTools: skill.allowedTools,
			resources: skill.resources,
			warnings: skill.warnings,
		});
		tools.splice(0, tools.length, ...selectSkillTools(tools, skill.allowedTools));
		session.context.toolsContext.hasPrivateContext = true;
	};
	if (!options.tools && origin === 'main') {
		const activationTool = loadSkillTool(skillSnapshot, applyActivatedSkill);
		if (activationTool) tools.push(activationTool);
	}

	let closeMcp: (() => Promise<void>) | undefined;
	let mcpDiscovery: McpDiscoveryDiagnostics | undefined;
	if (!options.tools && origin === 'main') {
		const mcp = await loadMcpTools(signal);
		tools.push(...mcp.tools);
		const childTools = selectOriginTools(tools, origin, input.toolsAllow, input.toolsDeny);
		const childRuntime = {
			...(options.permissions ? { permissions: options.permissions } : {}),
			...(options.resources ? { resources: options.resources } : {}),
			...(options.providerLimiter ? { providerLimiter: options.providerLimiter } : {}),
			...(options.subagentLimiter ? { subagentLimiter: options.subagentLimiter } : {}),
		};
		tools.push(
			subagentTool(config, childTools, session.context, childRuntime),
			subagentsTool(config, childTools, session.context, childRuntime, options.subagentLimiter)
		);
		closeMcp = mcp.close;
		mcpDiscovery = mcp.diagnostics;
	}
	tools = selectOriginTools(tools, origin, input.toolsAllow, input.toolsDeny);
	if (input.explicitSkill)
		applyActivatedSkill(await activateSkill(skillSnapshot, input.explicitSkill));

	yield {
		type: 'run_started',
		sessionId: session.id,
		model: modelId,
		providerId: provider.id,
		tools: tools.map((tool) => tool.id),
		skillDiagnostics: skillSnapshot.diagnostics,
		skillActivations: ((session.context.loadedSkills as LoadedSkill[] | undefined) ?? []).map(
			(skill) => ({
				id: skill.id,
				name: skill.name,
				hash: skill.hash,
				trust: skill.trust,
			})
		),
		...(mcpDiscovery ? { mcpDiscovery } : {}),
	};

	try {
		let toolOutputBytes = 0;
		let paidToolCalls = 0;
		let botWebToolCalls = 0;
		while (true) {
			if (signal.aborted) return;
			session.context.systemPrompt = await buildSystemPrompt(
				config,
				tools,
				session.context.loadedSkills,
				session.context.basePrompt,
				contextMode,
				tools.some((tool) => tool.id === 'load_skill')
			);
			const protectedSkillPrompt = buildLoadedSkillPrompt(session.context.loadedSkills ?? []);
			const workspaceContext =
				origin === 'main' && contextMode === 'workspace' && session.context.basePrompt === undefined
					? await buildWorkspaceContext(config)
					: '';
			const implicitSkills = skillSnapshot.skills.filter(
				(skill) =>
					skill.enabled &&
					skill.trust === 'user-controlled' &&
					skill.invocationPolicy === 'implicit'
			);
			const skillContext = tools.some((tool) => tool.id === 'load_skill')
				? buildSkillContext(implicitSkills)
				: '';
			const runtimeContext = [workspaceContext, skillContext].filter(Boolean).join('\n\n');
			if (runtimeContext) session.context.toolsContext.hasPrivateContext = true;
			const messages = session.messages;
			const turn = yield* runModelTurn(
				input,
				provider,
				modelId,
				session.context.systemPrompt,
				messages,
				tools,
				signal,
				modelOptions,
				undefined,
				protectedSkillPrompt,
				runtimeContext ? [{ role: 'user', content: runtimeContext }] : [],
				options.streaming ?? true,
				options.providerLimiter
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

			if (session.toolCalls.length + turn.toolCalls.length > MAX_TOOL_CALLS) {
				session.stopReason = 'max_tool_calls';
				yield { type: 'run_finished', result: toResult(session, 'success') };
				return;
			}
			const paidTools = new Set(['create_image', 'create_video', 'create_sound']);
			const requestedPaidCalls = turn.toolCalls.filter((call) => paidTools.has(call.name)).length;
			if (paidToolCalls + requestedPaidCalls > MAX_PAID_TOOL_CALLS) {
				session.stopReason = 'budget_exhausted';
				yield { type: 'run_finished', result: toResult(session, 'success') };
				return;
			}
			paidToolCalls += requestedPaidCalls;
			const requestedBotWebCalls =
				origin === 'bot'
					? turn.toolCalls.filter((call) => call.name === 'web_search' || call.name === 'web_fetch')
							.length
					: 0;
			if (botWebToolCalls + requestedBotWebCalls > MAX_BOT_WEB_TOOL_CALLS) {
				session.stopReason = 'budget_exhausted';
				yield { type: 'run_finished', result: toResult(session, 'success') };
				return;
			}
			botWebToolCalls += requestedBotWebCalls;

			if (isExhausted(session)) {
				session.stopReason = 'max_iterations';
				const result = toResult(session, 'error_max_turns');
				yield { type: 'run_finished', result };
				return;
			}

			let outputBudgetExceeded = false;
			for await (const event of runToolCalls(
				tools,
				turn.toolCalls,
				interactive,
				signal,
				session.context.toolsContext,
				permissionMode,
				{
					runId,
					origin,
					...(input.approvalWindowId === undefined ? {} : { windowId: input.approvalWindowId }),
				},
				options.permissions,
				options.resources
			)) {
				yield event;
				if (event.type !== 'tool_call_end') continue;
				toolOutputBytes += Buffer.byteLength(formatToolOutput(event.output), 'utf8');
				if (toolOutputBytes > MAX_TOOL_OUTPUT_BYTES) {
					outputBudgetExceeded = true;
					break;
				}
			}
			addToolResults(session, turn.toolCalls);
			if (outputBudgetExceeded) {
				session.stopReason = 'budget_exhausted';
				yield { type: 'run_finished', result: toResult(session, 'success') };
				return;
			}

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
