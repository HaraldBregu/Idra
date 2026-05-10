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
	tick: 'cron:tick',
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
	[CronChannels.list]: { args: []; result: import('./cron').CronTask[] };
	[CronChannels.add]: {
		args: [expression: string, options?: { id?: string; timezone?: string }];
		result: import('./cron').CronTask;
	};
	[CronChannels.remove]: { args: [id: string]; result: void };
}

export interface InvokeChannelMap
	extends AppInvokeChannelMap,
		AssistantInvokeChannelMap,
		WindowInvokeChannelMap,
		CronInvokeChannelMap {}

export interface SendChannelMap {
	[WindowChannels.minimize]: { args: [] };
	[WindowChannels.maximize]: { args: [] };
	[WindowChannels.close]: { args: [] };
}

interface AssistantEventChannelMap {
	[AssistantChannels.response]: { data: { response: string } };
}

interface WindowEventChannelMap {
	[WindowChannels.maximizeChange]: { data: boolean };
	[WindowChannels.fullScreenChange]: { data: boolean };
}

export interface EventChannelMap extends AssistantEventChannelMap, WindowEventChannelMap {}
