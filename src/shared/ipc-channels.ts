export const WindowChannels = {
	minimize: 'window:minimize',
	maximize: 'window:maximize',
	close: 'window:close',
	isMaximized: 'window:is-maximized',
	isFullScreen: 'window:is-fullscreen',
	maximizeChange: 'window:maximize-change',
	fullScreenChange: 'window:fullscreen-change',
	popupMenu: 'window:popup-menu',
} as const;

export const AssistantChannels = {
	send: 'assistant:send',
	reset: 'assistant:reset',
	getHistory: 'assistant:get-history',
	response: 'assistant:response',
	resolveApproval: 'assistant:resolve-approval',
	resolveInput: 'assistant:resolve-input',
	cancel: 'assistant:cancel',
	getPending: 'assistant:get-pending',
	pending: 'assistant:pending',
} as const;

export const ProviderChannels = {
	setApiKey: 'provider:set-apikey',
	isApiKeySaved: 'provider:is-api-key-saved',
	getAll: 'provider:get-all',
	add: 'provider:add',
	getModels: 'provider:get-models',
	getAssistantService: 'provider:get-assistant-service',
	saveAssistantService: 'provider:save-assistant-service',
} as const;

export const CronChannels = {
	list: 'cron:list',
	add: 'cron:add',
	remove: 'cron:remove',
} as const;

export const AppsChannels = {
	list: 'apps:list',
	openFolder: 'apps:open-folder',
	delete: 'apps:delete',
	getRoot: 'apps:get-root',
} as const;

export const SkillsChannels = {
	list: 'skills:list',
	import: 'skills:import',
	delete: 'skills:delete',
	getRoot: 'skills:get-root',
} as const;

export const ConnectorsChannels = {
	catalog: 'connectors:catalog',
	list: 'connectors:list',
	add: 'connectors:add',
	update: 'connectors:update',
	remove: 'connectors:remove',
	enable: 'connectors:enable',
	disable: 'connectors:disable',
	test: 'connectors:test',
	reconnect: 'connectors:reconnect',
	refreshTools: 'connectors:refreshTools',
	listTools: 'connectors:listTools',
	callTool: 'connectors:callTool',
	get: 'connectors:get',
} as const;

export const ChannelsChannels = {
	getTelegramConfig: 'channels:telegram:get-config',
	saveTelegramConfig: 'channels:telegram:save-config',
	getTelegramStatus: 'channels:telegram:get-status',
	startTelegram: 'channels:telegram:start',
	stopTelegram: 'channels:telegram:stop',
	restartTelegram: 'channels:telegram:restart',
	statusChanged: 'channels:status-changed',
} as const;

interface AppInvokeChannelMap {
	[ProviderChannels.setApiKey]: {
		args: [providerId: string, apikey: string];
		result: void;
	};
	[ProviderChannels.isApiKeySaved]: {
		args: [providerId: string];
		result: boolean;
	};
	[ProviderChannels.getAll]: {
		args: [];
		result: import('./providers').PublicProvider[];
	};
	[ProviderChannels.add]: {
		args: [input: import('./providers').ProviderInput];
		result: import('./providers').PublicProvider;
	};
	[ProviderChannels.getModels]: {
		args: [provider: import('./providers').PublicProvider];
		result: import('./service').Model[];
	};
	[ProviderChannels.getAssistantService]: {
		args: [];
		result: import('./service').Assistant | undefined;
	};
	[ProviderChannels.saveAssistantService]: {
		args: [provider: import('./providers').PublicProvider, model: import('./service').Model];
		result: boolean;
	};
}

interface AssistantInvokeChannelMap {
	[AssistantChannels.send]: { args: [message: string]; result: string };
	[AssistantChannels.reset]: { args: []; result: void };
	[AssistantChannels.getHistory]: {
		args: [];
		result: import('./service').AssistantHistoryMessage[];
	};
	[AssistantChannels.resolveApproval]: {
		args: [id: string, decision: import('./service').ApprovalDecision | boolean];
		result: boolean;
	};
	[AssistantChannels.resolveInput]: {
		args: [id: string, answer: string];
		result: boolean;
	};
	[AssistantChannels.cancel]: { args: []; result: void };
	[AssistantChannels.getPending]: {
		args: [];
		result: import('./service').AssistantPendingState;
	};
}

interface WindowInvokeChannelMap {
	[WindowChannels.isMaximized]: { args: []; result: boolean };
	[WindowChannels.isFullScreen]: { args: []; result: boolean };
}

interface CronInvokeChannelMap {
	[CronChannels.list]: { args: []; result: import('./cron').CronTaskView[] };
	[CronChannels.add]: {
		args: [
			expression: string,
			data: import('./cron').CronTaskData,
			options?: { id?: string; timezone?: string },
		];
		result: import('./cron').CronTask;
	};
	[CronChannels.remove]: { args: [id: string]; result: void };
}

interface AppsInvokeChannelMap {
	[AppsChannels.list]: { args: []; result: import('./apps').AppInfo[] };
	[AppsChannels.openFolder]: { args: [id: string]; result: void };
	[AppsChannels.delete]: { args: [id: string]; result: void };
	[AppsChannels.getRoot]: { args: []; result: string };
}

interface SkillsInvokeChannelMap {
	[SkillsChannels.list]: { args: []; result: import('./skills').SkillInfo[] };
	[SkillsChannels.import]: { args: []; result: import('./skills').SkillInfo | undefined };
	[SkillsChannels.delete]: { args: [id: string]; result: void };
	[SkillsChannels.getRoot]: { args: []; result: string };
}

interface ConnectorsInvokeChannelMap {
	[ConnectorsChannels.catalog]: {
		args: [];
		result: typeof import('./connectors').OPENAI_CONNECTOR_CATALOG;
	};
	[ConnectorsChannels.list]: { args: []; result: import('./connectors').ConnectorView[] };
	[ConnectorsChannels.get]: {
		args: [id: string];
		result: import('./connectors').ConnectorConfig;
	};
	[ConnectorsChannels.add]: {
		args: [input: import('./connectors').ConnectorInput];
		result: import('./connectors').ConnectorConfig;
	};
	[ConnectorsChannels.update]: {
		args: [id: string, input: import('./connectors').ConnectorUpdateInput];
		result: import('./connectors').ConnectorConfig;
	};
	[ConnectorsChannels.remove]: { args: [id: string]; result: void };
	[ConnectorsChannels.enable]: {
		args: [id: string];
		result: import('./connectors').ConnectorConfig;
	};
	[ConnectorsChannels.disable]: {
		args: [id: string];
		result: import('./connectors').ConnectorConfig;
	};
	[ConnectorsChannels.test]: {
		args: [id: string];
		result: import('./connectors').ConnectorTestResult;
	};
	[ConnectorsChannels.reconnect]: {
		args: [id: string];
		result: import('./connectors').ConnectorTestResult;
	};
	[ConnectorsChannels.refreshTools]: {
		args: [id: string];
		result: import('./connectors').ConnectorTool[];
	};
	[ConnectorsChannels.listTools]: {
		args: [id: string];
		result: import('./connectors').ConnectorTool[];
	};
	[ConnectorsChannels.callTool]: {
		args: [
			id: string,
			name: string,
			args: unknown,
			options?: import('./connectors').ConnectorCallToolOptions,
		];
		result: unknown;
	};
}

interface ChannelsInvokeChannelMap {
	[ChannelsChannels.getTelegramConfig]: {
		args: [];
		result: import('./channels').TelegramChannelProperties;
	};
	[ChannelsChannels.saveTelegramConfig]: {
		args: [config: import('./channels').TelegramChannelProperties];
		result: import('./channels').TelegramChannelProperties;
	};
	[ChannelsChannels.getTelegramStatus]: {
		args: [];
		result: import('./channels').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.startTelegram]: {
		args: [];
		result: import('./channels').ChannelStatusEvent | undefined;
	};
	[ChannelsChannels.stopTelegram]: {
		args: [];
		result: void;
	};
	[ChannelsChannels.restartTelegram]: {
		args: [];
		result: import('./channels').ChannelStatusEvent | undefined;
	};
}

export interface InvokeChannelMap
	extends AppInvokeChannelMap,
		AssistantInvokeChannelMap,
		WindowInvokeChannelMap,
		CronInvokeChannelMap,
		AppsInvokeChannelMap,
		SkillsInvokeChannelMap,
		ConnectorsInvokeChannelMap,
		ChannelsInvokeChannelMap {}

export interface SendChannelMap {
	[WindowChannels.minimize]: { args: [] };
	[WindowChannels.maximize]: { args: [] };
	[WindowChannels.close]: { args: [] };
	[WindowChannels.popupMenu]: { args: [] };
}

interface AssistantEventChannelMap {
	[AssistantChannels.response]: { data: import('./service').AssistantResponseDelta };
	[AssistantChannels.pending]: { data: import('./service').AssistantPendingEventPayload };
}

interface WindowEventChannelMap {
	[WindowChannels.maximizeChange]: { data: boolean };
	[WindowChannels.fullScreenChange]: { data: boolean };
}

interface ChannelsEventChannelMap {
	[ChannelsChannels.statusChanged]: { data: import('./channels').ChannelStatusEvent };
}

export interface EventChannelMap
	extends AssistantEventChannelMap,
		WindowEventChannelMap,
		ChannelsEventChannelMap {}
