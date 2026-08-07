import { typedInvokeUnwrap, typedOn } from '../shared/ipc_types';
import { AgentChannels } from '../shared/ipc_channels_definitions';
import type { AgentApi } from './index.d';
import type { PublicProvider } from '../shared';
import type {
	AgentHistoryMessage,
	AgentResponseEvent,
	AgentSessionSummary,
	AgentToolPermissionDecision,
	AgentPermissionMode,
	ModelReasoningEffort,
} from '../shared/agent_types';
import { normalizeAgentInputFiles } from '../shared/agent_files';
import type { HealthSettings } from '../main/agent/health/health_types';
import type { RagIndexResult, RagMatch } from '../main/rag';
import type { RagConfiguration } from '../shared/rag_types';
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

const AGENT_PERMISSION_MODES: readonly AgentPermissionMode[] = ['ask', 'bypass'];

function isAgentPermissionMode(value: unknown): value is AgentPermissionMode {
	return AGENT_PERMISSION_MODES.includes(value as AgentPermissionMode);
}

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
		...(isAgentPermissionMode(options.permissionMode)
			? { permissionMode: options.permissionMode }
			: {}),
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
	getWorkspaceLocation: (): Promise<string> => {
		return typedInvokeUnwrap(AgentChannels.getWorkspaceLocation);
	},
	listWorkspaceFiles: () => {
		return typedInvokeUnwrap(AgentChannels.listWorkspaceFiles);
	},
	readWorkspaceFile: (filePath: string): Promise<string> => {
		const normalizedFilePath = optionalTrimmedString(filePath);
		if (!normalizedFilePath) throw new Error('Invalid workspace file path.');
		return typedInvokeUnwrap(AgentChannels.readWorkspaceFile, normalizedFilePath);
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
	getModelOptions: (): Promise<Record<string, unknown>> => {
		return typedInvokeUnwrap(AgentChannels.getModelOptions);
	},
	setModelOptions: (options: Record<string, unknown>): Promise<Record<string, unknown>> => {
		return typedInvokeUnwrap(AgentChannels.setModelOptions, options);
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
	policySetMode: (mode: AgentPermissionMode): Promise<PermissionsSchema> => {
		return typedInvokeUnwrap(AgentChannels.policySetMode, mode);
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
	ragIndex: (): Promise<RagIndexResult> => {
		return typedInvokeUnwrap(AgentChannels.ragIndex);
	},
	ragGetConfiguration: (): Promise<RagConfiguration> => {
		return typedInvokeUnwrap(AgentChannels.ragGetConfiguration);
	},
	ragSaveConfiguration: (configuration: RagConfiguration): Promise<RagConfiguration> => {
		return typedInvokeUnwrap(AgentChannels.ragSaveConfiguration, configuration);
	},
	ragSearch: (query: string, topK?: number): Promise<RagMatch[]> => {
		const normalizedQuery = optionalTrimmedString(query);
		if (!normalizedQuery) throw new Error('Invalid search query.');
		return typedInvokeUnwrap(AgentChannels.ragSearch, normalizedQuery, topK);
	},
	ragPickFolder: (): Promise<string | undefined> => {
		return typedInvokeUnwrap(AgentChannels.ragPickFolder);
	},
} satisfies AgentApi;
