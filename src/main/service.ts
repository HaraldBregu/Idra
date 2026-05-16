import { randomUUID } from 'node:crypto';
import type { EventBus } from './core/event-bus';
import type { CronService } from './cron';
import type { LoggerService } from './logger';
import type { McpRegistry } from './mcp';
import type { StoreService } from './store';
import {
	DEFAULT_BOOTSTRAP_FILENAME,
	resolveBootstrapMode,
	type BootstrapMode,
	type WorkspaceContextFile,
	type WorkspaceService,
} from './workspace';
import type { UserDataDirectoryServicePort } from './user-data';
import type { ConnectorsService } from './connectors';
import type { SkillsService } from './skills';
import { buildSystemPrompt } from './agent/system-prompt';
import { runAgent, type AgentRunHooks, type AgentRunStreamEvent } from './agent/run';
import { DEFAULT_AGENT_ID } from './constants';
import { HitlBridge } from './hitl';
import { makeProvider, type ProviderSpec } from './provider/factory';
import type { ProviderAdapter, TranscriptEntry } from './provider/types';
import { loadSession, saveSession, clearSession, type SessionFile } from './session/store';
import { createTools } from './tools/registry';
import { selectAgentToolsForTurn, ToolUsePolicy } from './tools/management';
import type { AgentTool, ToolContext } from './tools/types';
import { AgentRunLogger, type RunLogFinish, type TokenUsage } from './run-logger';
import { resolveDefaultUserDataPath } from './user-data';
import type { ApprovalDecision } from '../shared/service';

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_MAX_ITERATIONS = 25;
const DEFAULT_MAX_PROMPT_TOOLS = 6;
const BOOTSTRAP_TOOL_NAMES = new Set([
	'read',
	'write',
	'edit',
	'exec',
	'get_workspace_path',
	'ask_human',
]);

export interface AgentServiceDependencies {
	store: StoreService;
	cron: CronService;
	logger: LoggerService;
	eventBus: EventBus;
	workspace: WorkspaceService;
	userDataDirectory: UserDataDirectoryServicePort;
	mcpRegistry?: McpRegistry;
	connectors?: ConnectorsService;
	skills?: SkillsService;
}

export interface AgentToolsFactoryContext {
	agentId: string;
	runId: string;
	providerId: string;
	model: string;
	workspace: string;
	session: SessionFile;
	signal: AbortSignal;
	services: AgentServiceDependencies;
}

export type AgentToolsFactory = (
	context: AgentToolsFactoryContext
) => AgentTool[] | Promise<AgentTool[]>;

export interface AgentServiceOptions {
	defaultAgentId?: string;
	providerFactory?: (provider: ProviderSpec, model: string) => ProviderAdapter;
	toolsFactory?: AgentToolsFactory;
	runLoggerFactory?: (agentId: string) => AgentRunLogger;
	sessionBaseDir?: string;
}

interface Runtime {
	hitl: HitlBridge;
	runLogger: AgentRunLogger;
	session: SessionFile | null;
	currentAbort: AbortController | null;
}

function emptyUsage(): TokenUsage {
	return { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
}

export class AgentService {
	private readonly defaultAgentId: string;
	private readonly providerFactory: (provider: ProviderSpec, model: string) => ProviderAdapter;
	private readonly toolsFactory: AgentToolsFactory;
	private readonly runLoggerFactory: (agentId: string) => AgentRunLogger;
	private readonly sessionBaseDir?: string;
	private readonly runtimes = new Map<string, Runtime>();

	constructor(
		private readonly dependencies: AgentServiceDependencies,
		options: AgentServiceOptions = {}
	) {
		this.defaultAgentId = options.defaultAgentId ?? DEFAULT_AGENT_ID;
		this.providerFactory = options.providerFactory ?? makeProvider;
		this.toolsFactory =
			options.toolsFactory ??
			(() => createTools({ profile: 'full', allow: [], deny: [] }));
		this.runLoggerFactory = options.runLoggerFactory ?? ((id) => new AgentRunLogger(id));
		this.sessionBaseDir = options.sessionBaseDir;
		this.ensureRuntime(this.defaultAgentId);
	}

	async send(message: string, agentId = this.defaultAgentId): Promise<string> {
		const runtime = this.ensureRuntime(agentId);
		if (runtime.currentAbort) {
			runtime.currentAbort.abort();
			runtime.hitl.cancelAll('user_continued');
		}

		const abort = new AbortController();
		runtime.currentAbort = abort;
		const runId = randomUUID();
		const streamEvent = (event: AgentRunStreamEvent): void => {
			this.dependencies.eventBus.broadcast('agent:response', {
				agentId,
				runId,
				...event,
			});
		};

		try {
			const { providerId, apiKey, model, baseURL } = this.resolveProviderAndModel();
			runtime.session = await loadSession(agentId, model, providerId, {
				baseDir: this.sessionBaseDir,
			});
			const workspaceRoot = this.workspaceRoot();
			const workspaceFiles = await this.loadWorkspaceFiles();
			const bootstrapPending = workspaceFiles.some(
				(file) => file.name === DEFAULT_BOOTSTRAP_FILENAME && !file.missing
			);
			const baseTools = await this.toolsFactory({
				agentId,
				runId,
				providerId,
				model,
				workspace: workspaceRoot,
				session: runtime.session,
				signal: abort.signal,
				services: this.dependencies,
			});
			const provider = this.providerFactory({ id: providerId, apiKey, baseURL }, model);
			const emitWaitingForApproval = (): void => {
				streamEvent({
					type: 'run_state',
					state: 'waiting_for_approval',
					label: 'Needs approval',
				});
			};
			const ctx: ToolContext = {
				workspace: workspaceRoot,
				sessionId: runtime.session.id,
				readState: new Map(),
				plan: { entries: runtime.session.plan },
				approvalCache: new Set(),
				approvalRequired: new Set(),
				approveStream: {
					ask: (question, args, toolName) => {
						emitWaitingForApproval();
						return runtime.hitl.ask(question, args, toolName);
					},
				},
				elicit: {
					ask: (question, suggestions) => {
						emitWaitingForApproval();
						return runtime.hitl.askInput(question, suggestions);
					},
				},
				services: this.dependencies,
			};
			const toolPolicy = new ToolUsePolicy().evaluate({ userRequest: message });
			const skillRuntime = this.dependencies.skills && toolPolicy.shouldUseTools && !bootstrapPending
				? {
						userId: agentId,
						sessionId: runtime.session.id,
						tools: baseTools,
						toolContext: ctx,
						signal: abort.signal,
					}
				: undefined;
			const skillChoices = skillRuntime
				? await this.dependencies.skills!.discoverForPrompt(message, skillRuntime)
				: [];
			const skillTool = skillRuntime && skillChoices.length > 0
				? this.dependencies.skills!.createExecutionTool({
						userId: skillRuntime.userId,
						sessionId: skillRuntime.sessionId,
						tools: skillRuntime.tools,
						signal: skillRuntime.signal,
					})
				: undefined;
			const tools = skillTool ? [...baseTools, skillTool] : baseTools;
			const toolSelection = bootstrapPending
				? { toolsForPrompt: tools.filter((tool) => BOOTSTRAP_TOOL_NAMES.has(tool.name)), systemPromptSuffix: '' }
				: selectAgentToolsForTurn(tools, message, ctx, {
						forceSelection: true,
						maxPromptTools: DEFAULT_MAX_PROMPT_TOOLS,
					});
			const selectedTools = bootstrapPending
				? toolSelection.toolsForPrompt
				: skillTool && skillChoices.length > 0
					? [
							skillTool,
							...toolSelection.toolsForPrompt
								.filter((tool) => tool.name !== skillTool.name)
								.slice(0, DEFAULT_MAX_PROMPT_TOOLS - 1),
						]
					: toolSelection.toolsForPrompt;
			const selectedToolNames = new Set(selectedTools.map((tool) => tool.name));
			const bootstrapMode = resolveBootstrapMode({
				bootstrapPending,
				isInteractiveUserFacing: true,
				isPrimaryRun: agentId === this.defaultAgentId,
				isCanonicalWorkspace: workspaceRoot === this.workspaceRoot(),
				hasBootstrapFileAccess:
					selectedToolNames.has('read') &&
					(selectedToolNames.has('write') || selectedToolNames.has('edit')) &&
					selectedToolNames.has('exec'),
			});
			const systemPrompt = await buildSystemPrompt({
				workspace: workspaceRoot,
				date: new Date().toISOString().slice(0, 10),
				model,
				tools: selectedTools,
				skills: selectedToolNames.has('execute_skill') ? skillChoices : [],
				workspaceFiles,
				bootstrapMode,
			});
			const systemPromptForTurn = toolSelection.systemPromptSuffix
				? `${systemPrompt}\n\n${toolSelection.systemPromptSuffix}`
				: systemPrompt;

			const hooks = this.buildHooks(agentId, {
				runId,
				providerId,
				model,
				tools: selectedTools.map((tool) => tool.name),
				runLogger: runtime.runLogger,
			});

			const result = await runAgent({
				runId,
				userMessage: message,
				systemPrompt: systemPromptForTurn,
				session: runtime.session,
				provider,
				model,
				tools: selectedTools,
				ctx,
				maxTokens: DEFAULT_MAX_TOKENS,
				maxIterations: DEFAULT_MAX_ITERATIONS,
				streamEvent,
				hooks,
				signal: abort.signal,
				toolManagement: { enabled: false },
			});

			runtime.session = result.session;
			await saveSession(runtime.session, { baseDir: this.sessionBaseDir });
			runtime.currentAbort = null;
			streamEvent({
				type: 'run_state',
				state: result.stopReason === 'cancelled' ? 'cancelled' : 'completed',
				label: result.stopReason === 'cancelled' ? 'Cancelled' : 'Completed',
			});
			return result.finalText;
		} catch (err) {
			runtime.currentAbort = null;
			streamEvent({
				type: 'run_state',
				state: abort.signal.aborted ? 'cancelled' : 'error',
				label: abort.signal.aborted ? 'Cancelled' : (err as Error).message,
			});
			this.dependencies.logger.error('AgentService', 'send failed', {
				message: (err as Error).message,
				stack: (err as Error).stack,
			});
			await runtime.runLogger.logFinish({
				runId,
				agentId,
				provider: 'unknown',
				model: 'unknown',
				status: 'error',
				iterations: 0,
				durationMs: 0,
				usage: emptyUsage(),
				outputChars: 0,
				error: { message: (err as Error).message, stack: (err as Error).stack },
			});
			throw err;
		}
	}

	async reset(agentId = this.defaultAgentId): Promise<void> {
		const runtime = this.ensureRuntime(agentId);
		this.cancel(agentId);
		this.dependencies.logger.info('AgentService', `reset "${agentId}"`);
		await clearSession(agentId, { baseDir: this.sessionBaseDir });
		runtime.session = null;
	}

	async getHistory(agentId = this.defaultAgentId): Promise<TranscriptEntry[]> {
		const runtime = this.ensureRuntime(agentId);
		if (!runtime.session) {
			const { providerId, model } = this.tryResolveProviderAndModel();
			runtime.session = await loadSession(agentId, model, providerId, {
				baseDir: this.sessionBaseDir,
			});
		}
		return [...runtime.session.transcript];
	}

	resolveApproval(
		id: string,
		decision: ApprovalDecision | boolean,
		agentId = this.defaultAgentId
	): boolean {
		return this.ensureRuntime(agentId).hitl.resolveApproval(id, decision);
	}

	resolveInput(id: string, answer: string, agentId = this.defaultAgentId): boolean {
		return this.ensureRuntime(agentId).hitl.resolveInput(id, answer);
	}

	cancel(agentId = this.defaultAgentId): void {
		const runtime = this.ensureRuntime(agentId);
		if (runtime.currentAbort) {
			runtime.currentAbort.abort();
			runtime.currentAbort = null;
		}
		runtime.hitl.cancelAll('cancelled');
	}

	getPending(agentId = this.defaultAgentId): ReturnType<HitlBridge['getPending']> {
		return this.ensureRuntime(agentId).hitl.getPending();
	}

	private ensureRuntime(agentId: string): Runtime {
		const existing = this.runtimes.get(agentId);
		if (existing) return existing;
		this.dependencies.logger.info('AgentService', `Creating agent runtime "${agentId}"`);
		const runtime: Runtime = {
			hitl: new HitlBridge(this.dependencies.eventBus, agentId),
			runLogger: this.runLoggerFactory(agentId),
			session: null,
			currentAbort: null,
		};
		this.runtimes.set(agentId, runtime);
		return runtime;
	}

	private resolveProviderAndModel(): { providerId: string; apiKey: string; model: string; baseURL?: string } {
		const agent = this.dependencies.store.getAgentService();
		const providerId = agent?.provider.id.trim().toLowerCase() ?? '';
		const model = agent?.model.id.trim() || agent?.model.name.trim() || '';
		if (!providerId) throw new Error('Agent provider not configured.');
		if (!model) throw new Error('Agent model not configured.');
		const provider = this.dependencies.store.getProviderById(providerId);
		if (!provider) throw new Error(`Provider not configured: ${providerId}`);
		const apiKey = provider.apiKey.trim();
		if (!apiKey) throw new Error(`API key missing for provider: ${providerId}`);
		return { providerId, apiKey, model, baseURL: provider.baseUrl };
	}

	private tryResolveProviderAndModel(): { providerId: string; model: string } {
		try {
			const { providerId, model } = this.resolveProviderAndModel();
			return { providerId, model };
		} catch {
			return { providerId: 'unknown', model: 'unknown' };
		}
	}

	private workspaceRoot(): string {
		try {
			return this.dependencies.workspace.getRootPath();
		} catch {
			return resolveDefaultUserDataPath('workspace');
		}
	}

	private async loadWorkspaceFiles(): Promise<WorkspaceContextFile[]> {
		const workspace = this.dependencies.workspace as Partial<WorkspaceService>;
		try {
			if (typeof workspace.ensureReady === 'function') {
				await workspace.ensureReady();
			}
			if (typeof workspace.loadContextFiles === 'function') {
				return await workspace.loadContextFiles();
			}
		} catch (error) {
			this.dependencies.logger.warn('AgentService', 'Workspace context unavailable', {
				error: (error as Error).message,
			});
		}
		return [];
	}

	private buildHooks(
		agentId: string,
		meta: {
			runId: string;
			providerId: string;
			model: string;
			tools: string[];
			runLogger: AgentRunLogger;
		}
	): AgentRunHooks {
		return {
			onStart: async () => {
				await meta.runLogger.logStart({
					runId: meta.runId,
					agentId,
					provider: meta.providerId,
					model: meta.model,
					systemPromptChars: 0,
					userMessageChars: 0,
					tools: meta.tools,
					mcpToolCount: 0,
				});
			},
			onIteration: async (info) => {
				await meta.runLogger.logIteration({
					runId: meta.runId,
					agentId,
					iteration: info.iteration,
					usage: {
						inputTokens: info.usage.inputTokens,
						outputTokens: info.usage.outputTokens,
						totalTokens: info.usage.inputTokens + info.usage.outputTokens,
					},
					durationMs: 0,
				});
			},
			onToolCall: async (info) => {
				await meta.runLogger.logToolCall({
					runId: meta.runId,
					agentId,
					iteration: info.iteration,
					callId: info.callId,
					tool: info.tool,
					arguments: JSON.stringify(info.args ?? {}),
					durationMs: info.durationMs,
					status: info.status,
					outputChars: info.outputChars,
					outputText: info.outputText,
				});
			},
			onFinish: async (info) => {
				const status: RunLogFinish['status'] =
					info.stopReason === 'cancelled'
						? 'cancelled'
						: info.stopReason === 'end_turn'
							? 'completed'
							: info.stopReason === 'max_iterations'
								? 'max_iterations'
								: info.stopReason === 'error'
									? 'error'
									: 'completed';
				const usage: TokenUsage = {
					inputTokens: info.usage.inputTokens,
					outputTokens: info.usage.outputTokens,
					totalTokens: info.usage.inputTokens + info.usage.outputTokens,
				};
				await meta.runLogger.logFinish({
					runId: meta.runId,
					agentId,
					provider: meta.providerId,
					model: meta.model,
					status,
					iterations: info.iterations,
					durationMs: info.durationMs,
					usage,
					outputChars: 0,
					error: info.error ? { message: info.error.message, stack: info.error.stack } : undefined,
				});
			},
		};
	}
}
