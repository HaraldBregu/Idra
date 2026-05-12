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
} as const;

export const ProviderChannels = {
	setApiKey: 'provider:set-apikey',
	isApiKeySaved: 'provider:is-api-key-saved',
	getAll: 'provider:get-all',
	getModels: 'provider:get-models',
	getAssistantService: 'provider:get-assistant-service',
	saveAssistantService: 'provider:save-assistant-service',
} as const;

export const CronChannels = {
	list: 'cron:list',
	add: 'cron:add',
	remove: 'cron:remove',
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

export const PluginChannels = {
	list: 'plugin:list',
	open: 'plugin:open',
	reload: 'plugin:reload',
} as const;

export const FridayChannels = {
	providersList: 'friday:providers:list',
	providersGetModels: 'friday:providers:get-models',
	workspaceGetScratchPath: 'friday:workspace:get-scratch-path',
	workspaceReadJson: 'friday:workspace:read-json',
	workspaceWriteJson: 'friday:workspace:write-json',
	assistantSend: 'friday:assistant:send',
	cronList: 'friday:cron:list',
	cronAdd: 'friday:cron:add',
	cronRemove: 'friday:cron:remove',
	themeGet: 'friday:theme:get',
	themeChanged: 'friday:theme:changed',
	channelsStatus: 'friday:channels:status',
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
		ChannelsInvokeChannelMap {}

export interface SendChannelMap {
	[WindowChannels.minimize]: { args: [] };
	[WindowChannels.maximize]: { args: [] };
	[WindowChannels.close]: { args: [] };
	[WindowChannels.popupMenu]: { args: [] };
}

interface AssistantEventChannelMap {
	[AssistantChannels.response]: { data: { response: string } };
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
