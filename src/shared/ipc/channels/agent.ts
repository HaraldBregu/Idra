export const AgentChannels = {
	send: 'agent:send',
	response: 'agent:response',
	cancel: 'agent:cancel',
	lastMessages: 'agent:last-messages',
	clearMessages: 'agent:clear-messages',
	getProvider: 'agent:get-provider',
	setProvider: 'agent:set-provider',
	getModelId: 'agent:get-model-id',
	setModelId: 'agent:set-model-id',
	cronList: 'agent:cron:list',
	cronGetRuntime: 'agent:cron:runtime:get',
	cronSetRuntime: 'agent:cron:runtime:set',
	skillsList: 'agent:skills:list',
	skillsLoad: 'agent:skills:load',
	skillsImport: 'agent:skills:import',
	skillsDownload: 'agent:skills:download',
	skillsDelete: 'agent:skills:delete',
	skillsSetEnabled: 'agent:skills:set-enabled',
	skillsOpenRoot: 'agent:skills:open-root',
	skillsGetRoot: 'agent:skills:get-root',
	healthSettings: 'agent:health:settings',
	healthSaveSettings: 'agent:health:settings:save',
	healthResetSettings: 'agent:health:settings:reset',
	mcpList: 'agent:mcp:list',
	mcpGet: 'agent:mcp:get',
	mcpSave: 'agent:mcp:save',
	mcpDelete: 'agent:mcp:delete',
	mcpOauthStart: 'agent:mcp:oauth:start',
	mcpOauthFinish: 'agent:mcp:oauth:finish',
} as const;

export interface AgentInvokeChannelMap {
	[AgentChannels.send]: {
		args: [message: string, options?: Record<string, unknown>];
		result: string;
	};
	[AgentChannels.cancel]: { args: []; result: void };
	[AgentChannels.lastMessages]: {
		args: [sessionId: string];
		result: import('../../agent/types').AgentHistoryMessage[];
	};
	[AgentChannels.clearMessages]: { args: [sessionId: string]; result: void };
	[AgentChannels.getProvider]: {
		args: [];
		result: import('../../providers').PublicProvider | undefined;
	};
	[AgentChannels.setProvider]: {
		args: [provider: import('../../providers').PublicProvider];
		result: boolean;
	};
	[AgentChannels.getModelId]: {
		args: [];
		result: string | undefined;
	};
	[AgentChannels.setModelId]: {
		args: [modelId: string];
		result: boolean;
	};
	[AgentChannels.cronList]: { args: []; result: import('../../../main/agent/cron').CronSchedule[] };
	[AgentChannels.cronGetRuntime]: {
		args: [];
		result: import('../../../main/agent/cron').CronRuntime | undefined;
	};
	[AgentChannels.cronSetRuntime]: {
		args: [providerId: string, modelId: string];
		result: import('../../../main/agent/cron').CronRuntime;
	};
	[AgentChannels.skillsList]: { args: []; result: import('../../skills/types').SkillInfo[] };
	[AgentChannels.skillsLoad]: {
		args: [name: string];
		result: import('../../skills/types').SkillLoadResult | undefined;
	};
	[AgentChannels.skillsImport]: { args: []; result: import('../../skills/types').SkillImportResult | undefined };
	[AgentChannels.skillsDownload]: {
		args: [name: string];
		result: import('../../skills/types').SkillDownloadResult | undefined;
	};
	[AgentChannels.skillsDelete]: { args: [name: string]; result: import('../../skills/types').SkillDeleteResult };
	[AgentChannels.skillsSetEnabled]: {
		args: [id: string, enabled: boolean];
		result: import('../../skills/types').SkillInfo;
	};
	[AgentChannels.skillsOpenRoot]: { args: []; result: void };
	[AgentChannels.skillsGetRoot]: { args: []; result: string };
	[AgentChannels.healthSettings]: { args: []; result: import('../../../main/agent/health/health-types').HealthSettings };
	[AgentChannels.healthSaveSettings]: {
		args: [request: Partial<import('../../../main/agent/health/health-types').HealthSettings>];
		result: import('../../../main/agent/health/health-types').HealthSettings;
	};
	[AgentChannels.healthResetSettings]: { args: []; result: import('../../../main/agent/health/health-types').HealthSettings };
	[AgentChannels.mcpList]: { args: []; result: import('../../mcp').McpSettings };
	[AgentChannels.mcpGet]: { args: [id: string]; result: import('../../mcp').McpSettings };
	[AgentChannels.mcpSave]: { args: [input: import('../../mcp').McpSettings]; result: import('../../mcp').McpSettings };
	[AgentChannels.mcpDelete]: { args: [id: string]; result: void };
	[AgentChannels.mcpOauthStart]: { args: [id: string]; result: import('../../mcp').McpOAuthStart };
	[AgentChannels.mcpOauthFinish]: { args: [id: string, code: string]; result: void };
}

export interface AgentEventChannelMap {
	[AgentChannels.response]: { data: import('../../agent/types').AgentResponseEvent };
}
