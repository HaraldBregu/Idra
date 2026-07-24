import { typedInvokeUnwrap, typedOn } from '../shared/ipc_types';
import { AgentChannels } from '../shared/ipc_channels_definitions';
import type { AgentApi } from './index.d';
import type { PublicProvider } from '../shared';
import type {
	AgentHistoryMessage,
	AgentResponseEvent,
	AgentSessionSummary,
	AgentToolPermissionDecision,
	ModelReasoningEffort,
} from '../shared/agent_types';
import { normalizeAgentInputFiles } from '../shared/agent_files';
import type { HealthSettings } from '../main/agent/health/health_types';
import type {
	DirectoryPermissions,
	PermissionsSchema,
	ToolPermission,
} from '../main/agent/policy/policy_types';
import { optionalStringList, optionalTrimmedString } from './normalize';

const MODEL_REASONING_EFFORTS: readonly ModelReasoningEffort[] = [
	'none',
	'minimal',
	'low',
	'medium',
	'high',
	'xhigh',
];

function isModelReasoningEffort(value: unknown): value is ModelReasoningEffort {
	return MODEL_REASONING_EFFORTS.includes(value as ModelReasoningEffort);
}

function normalizeAgentSendRuntimeOptions(
	options?: Record<string, unknown>
): Record<string, unknown> | undefined {
	if (!options) return undefined;
	const normalized: Record<string, unknown> = {
		...(optionalTrimmedString(options.runId)
			? { runId: optionalTrimmedString(options.runId) }
			: {}),
		...(optionalTrimmedString(options.sessionId)
			? { sessionId: optionalTrimmedString(options.sessionId) }
			: {}),
		...(optionalTrimmedString(options.agentRuntime)
			? { agentRuntime: optionalTrimmedString(options.agentRuntime) }
			: {}),
		...(optionalTrimmedString(options.providerId)
			? { providerId: optionalTrimmedString(options.providerId) }
			: {}),
		...(optionalTrimmedString(options.model)
			? { model: optionalTrimmedString(options.model) }
			: {}),
		...(isModelReasoningEffort(options.effort) ? { effort: options.effort } : {}),
		...(typeof options.lightContext === 'boolean' ? { lightContext: options.lightContext } : {}),
		...(optionalStringList(options.toolsAllow)
			? { toolsAllow: optionalStringList(options.toolsAllow) }
			: {}),
		...(optionalStringList(options.toolsDeny)
			? { toolsDeny: optionalStringList(options.toolsDeny) }
			: {}),
		...(normalizeAgentInputFiles(options.files)
			? { files: normalizeAgentInputFiles(options.files) }
			: {}),
	};
	return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function sendAgent(
	channel: typeof AgentChannels.send,
	message: string,
	options?: Record<string, unknown>,
	onEvent?: (event: AgentResponseEvent) => void
): Promise<string> {
	const runId = optionalTrimmedString(options?.runId) || crypto.randomUUID();
	const runtimeOptions = normalizeAgentSendRuntimeOptions({ ...options, runId });

	const offResponse = typedOn(AgentChannels.response, (event: AgentResponseEvent) => {
		if (event.runId !== runId) return;
		onEvent?.(event);
	});

	return (
		runtimeOptions
			? typedInvokeUnwrap<string>(channel, message, runtimeOptions)
			: typedInvokeUnwrap<string>(channel, message)
	).finally(offResponse);
}

export const agent: AgentApi = {
	send: (
		message: string,
		options?: Record<string, unknown>,
		onEvent?: (event: AgentResponseEvent) => void
	): Promise<string> => {
		return sendAgent(AgentChannels.send, message, options, onEvent);
	},
	cancel: (): Promise<void> => {
		return typedInvokeUnwrap(AgentChannels.cancel);
	},
	respondToolPermission: (
		toolCallId: string,
		decision: AgentToolPermissionDecision
	): Promise<boolean> => {
		const normalizedToolCallId = optionalTrimmedString(toolCallId);
		if (!normalizedToolCallId) throw new Error('Invalid tool call id.');
		return typedInvokeUnwrap(AgentChannels.respondToolPermission, normalizedToolCallId, decision);
	},
	listSessions: (): Promise<AgentSessionSummary[]> => {
		return typedInvokeUnwrap(AgentChannels.listSessions);
	},
	getLastMessages: (sessionId: string): Promise<AgentHistoryMessage[]> => {
		const normalizedSessionId = optionalTrimmedString(sessionId);
		if (!normalizedSessionId) throw new Error('Invalid assistant session id.');
		return typedInvokeUnwrap(AgentChannels.lastMessages, normalizedSessionId);
	},
	clearMessages: (sessionId: string): Promise<void> => {
		const normalizedSessionId = optionalTrimmedString(sessionId);
		if (!normalizedSessionId) throw new Error('Invalid assistant session id.');
		return typedInvokeUnwrap(AgentChannels.clearMessages, normalizedSessionId);
	},
	deleteSession: (sessionId: string): Promise<void> => {
		const normalizedSessionId = optionalTrimmedString(sessionId);
		if (!normalizedSessionId) throw new Error('Invalid assistant session id.');
		return typedInvokeUnwrap(AgentChannels.deleteSession, normalizedSessionId);
	},
	getProvider: (): Promise<PublicProvider | undefined> => {
		return typedInvokeUnwrap(AgentChannels.getProvider);
	},
	setProvider: (provider: PublicProvider): Promise<boolean> => {
		return typedInvokeUnwrap(AgentChannels.setProvider, provider);
	},
	getModelId: (): Promise<string | undefined> => {
		return typedInvokeUnwrap(AgentChannels.getModelId);
	},
	setModelId: (modelId: string): Promise<boolean> => {
		return typedInvokeUnwrap(AgentChannels.setModelId, modelId);
	},
	skillsList: () => {
		return typedInvokeUnwrap(AgentChannels.skillsList);
	},
	skillsLoad: (name: string) => {
		return typedInvokeUnwrap(AgentChannels.skillsLoad, name);
	},
	skillsImport: () => {
		return typedInvokeUnwrap(AgentChannels.skillsImport);
	},
	skillsDownload: (name: string) => {
		return typedInvokeUnwrap(AgentChannels.skillsDownload, name);
	},
	skillsDelete: (name: string) => {
		return typedInvokeUnwrap(AgentChannels.skillsDelete, name);
	},
	skillsSetEnabled: (id: string, enabled: boolean) => {
		return typedInvokeUnwrap(AgentChannels.skillsSetEnabled, id, enabled);
	},
	skillsOpenRoot: () => {
		return typedInvokeUnwrap(AgentChannels.skillsOpenRoot);
	},
	skillsGetRoot: (): Promise<string> => {
		return typedInvokeUnwrap(AgentChannels.skillsGetRoot);
	},
	cronList: () => {
		return typedInvokeUnwrap(AgentChannels.cronList);
	},
	cronGetRuntime: () => {
		return typedInvokeUnwrap(AgentChannels.cronGetRuntime);
	},
	cronSetRuntime: (providerId: string, modelId: string) => {
		return typedInvokeUnwrap(AgentChannels.cronSetRuntime, providerId, modelId);
	},
	policyGet: (): Promise<PermissionsSchema> => {
		return typedInvokeUnwrap(AgentChannels.policyGet);
	},
	policyPickDirectory: (): Promise<string | undefined> => {
		return typedInvokeUnwrap(AgentChannels.policyPickDirectory);
	},
	policySetTool: (toolName: string, permission: ToolPermission): Promise<PermissionsSchema> => {
		return typedInvokeUnwrap(AgentChannels.policySetTool, toolName, permission);
	},
	policySetDirectories: (directories: DirectoryPermissions): Promise<PermissionsSchema> => {
		return typedInvokeUnwrap(AgentChannels.policySetDirectories, directories);
	},
	policyReset: (): Promise<PermissionsSchema> => {
		return typedInvokeUnwrap(AgentChannels.policyReset);
	},
	healthGetSettings: (): Promise<HealthSettings> => {
		return typedInvokeUnwrap(AgentChannels.healthSettings);
	},
	healthSaveSettings: (settings: Partial<HealthSettings>): Promise<HealthSettings> => {
		return typedInvokeUnwrap(AgentChannels.healthSaveSettings, settings);
	},
	healthResetSettings: (): Promise<HealthSettings> => {
		return typedInvokeUnwrap(AgentChannels.healthResetSettings);
	},
	healthGetData: (): Promise<string> => {
		return typedInvokeUnwrap(AgentChannels.healthData);
	},
	healthSaveData: (content: string): Promise<string> => {
		return typedInvokeUnwrap(AgentChannels.healthSaveData, content);
	},
	mcpList: (): Promise<McpSettings> => {
		return typedInvokeUnwrap<McpSettings>(AgentChannels.mcpList);
	},
	mcpGet: (id: string): Promise<McpSettings> => {
		return typedInvokeUnwrap<McpSettings>(AgentChannels.mcpGet, id);
	},
	mcpSave: (input: McpSettings): Promise<McpSettings> => {
		return typedInvokeUnwrap<McpSettings>(AgentChannels.mcpSave, input);
	},
	mcpDelete: (id: string): Promise<void> => {
		return typedInvokeUnwrap<void>(AgentChannels.mcpDelete, id);
	},
	mcpOauthStart: (id: string): Promise<McpOAuthStart> => {
		return typedInvokeUnwrap<McpOAuthStart>(AgentChannels.mcpOauthStart, id);
	},
	mcpOauthFinish: (id: string, code: string): Promise<void> => {
		return typedInvokeUnwrap<void>(AgentChannels.mcpOauthFinish, id, code);
	},
	libraryList: (): Promise<LibraryFile[]> => {
		return typedInvokeUnwrap(AgentChannels.libraryList);
	},
} satisfies AgentApi;
