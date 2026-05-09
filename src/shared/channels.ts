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
	response: 'assistant:response',
} as const;

export const ProviderChannels = {
	setApiKey: 'provider:set-apikey',
	getAll: 'provider:get-all',
	getModels: 'provider:get-models',
} as const;

interface AppInvokeChannelMap {
	[ProviderChannels.setApiKey]: {
		args: [providerId: string, apikey: string];
		result: void;
	};
	[ProviderChannels.getAll]: {
		args: [];
		result: import('./providers').Provider[];
	};
	[ProviderChannels.getModels]: {
		args: [provider: import('./providers').Provider];
		result: import('./service').Model[];
	};
}

interface AssistantInvokeChannelMap {
	[AssistantChannels.send]: { args: [message: string]; result: string };
	[AssistantChannels.reset]: { args: []; result: void };
}

interface WindowInvokeChannelMap {
	[WindowChannels.isMaximized]: { args: []; result: boolean };
	[WindowChannels.isFullScreen]: { args: []; result: boolean };
}

export interface InvokeChannelMap
	extends AppInvokeChannelMap,
		AssistantInvokeChannelMap,
		WindowInvokeChannelMap {}

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

export interface EventChannelMap
	extends AssistantEventChannelMap,
		WindowEventChannelMap {}
