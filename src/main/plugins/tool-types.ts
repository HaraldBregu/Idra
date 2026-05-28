import type { AgentTool } from '../tools/common';

export type AppConfig = Record<string, unknown>;
export type AuthContext = Record<string, unknown>;
export type DeliveryContext = Record<string, unknown>;

export type PluginToolContext = {
	config?: AppConfig;
	runtimeConfig?: AppConfig;
	getRuntimeConfig?: () => AppConfig | undefined;
	workspaceDir?: string;
	agentId?: string;
	sessionId?: string;
	runId?: string;
	provider?: string;
	modelId?: string;
	auth?: AuthContext;
	delivery?: DeliveryContext;
	sender?: { id?: string; isOwner?: boolean };
	sandboxed?: boolean;
};

export type PluginToolFactory = (
	ctx: PluginToolContext
) => AgentTool | AgentTool[] | null | undefined | Promise<AgentTool | AgentTool[] | null | undefined>;

export type PluginToolDescriptor = {
	name: string;
	optional?: boolean;
};

export type PluginToolManifest = {
	id: string;
	enabled?: boolean;
	tools: PluginToolDescriptor[];
};

