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

export interface AssistantResponseEvent {
	response: string;
}

interface AppInvokeChannelMap {
	[AssistantChannels.send]: { args: [message: string]; result: string };
	[AssistantChannels.reset]: { args: []; result: void };
}

interface WindowInvokeChannelMap {
	[WindowChannels.isMaximized]: { args: []; result: boolean };
	[WindowChannels.isFullScreen]: { args: []; result: boolean };
}

export interface InvokeChannelMap
	extends AppInvokeChannelMap,
		WindowInvokeChannelMap {}

export interface SendChannelMap {
	[WindowChannels.minimize]: { args: [] };
	[WindowChannels.maximize]: { args: [] };
	[WindowChannels.close]: { args: [] };
}

export interface EventChannelMap {
	[WindowChannels.maximizeChange]: { data: boolean };
	[WindowChannels.fullScreenChange]: { data: boolean };
	[AssistantChannels.response]: { data: AssistantResponseEvent };
}

