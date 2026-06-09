export const HeartbeatChannels = {
	status: 'heartbeat:status',
	last: 'heartbeat:last',
	settings: 'heartbeat:settings',
	saveSettings: 'heartbeat:save-settings',
	setEnabled: 'heartbeat:set-enabled',
	getTiming: 'heartbeat:get-timing',
	updateTiming: 'heartbeat:update-timing',
	setProviderId: 'heartbeat:set-provider-id',
	setModelId: 'heartbeat:set-model-id',
	setReasoningEffort: 'heartbeat:set-reasoning-effort',
	systemEvent: 'heartbeat:system-event',
	request: 'heartbeat:request',
	event: 'heartbeat:event',
} as const;

export interface HeartbeatInvokeChannelMap {
	[HeartbeatChannels.status]: {
		args: [];
		result: import('../heartbeat').HeartbeatStatus;
	};
	[HeartbeatChannels.last]: {
		args: [];
		result: import('../heartbeat').HeartbeatEventPayload | null;
	};
	[HeartbeatChannels.settings]: {
		args: [];
		result: import('../heartbeat').HeartbeatSettings;
	};
	[HeartbeatChannels.saveSettings]: {
		args: [request: import('../heartbeat').HeartbeatSettingsUpdate];
		result: import('../heartbeat').HeartbeatSettings;
	};
	[HeartbeatChannels.setEnabled]: {
		args: [request: import('../heartbeat').HeartbeatSetEnabledRequest];
		result: import('../heartbeat').HeartbeatStatus;
	};
	[HeartbeatChannels.getTiming]: {
		args: [];
		result: import('../heartbeat').HeartbeatTimingSettings;
	};
	[HeartbeatChannels.updateTiming]: {
		args: [request: import('../heartbeat').HeartbeatTimingSettings];
		result: import('../heartbeat').HeartbeatTimingSettings;
	};
	[HeartbeatChannels.setProviderId]: {
		args: [request: import('../heartbeat').HeartbeatSetProviderRequest];
		result: import('../heartbeat').HeartbeatSettings;
	};
	[HeartbeatChannels.setModelId]: {
		args: [request: import('../heartbeat').HeartbeatSetModelRequest];
		result: import('../heartbeat').HeartbeatSettings;
	};
	[HeartbeatChannels.setReasoningEffort]: {
		args: [request: import('../heartbeat').HeartbeatSetReasoningEffortRequest];
		result: import('../heartbeat').HeartbeatSettings;
	};
	[HeartbeatChannels.systemEvent]: {
		args: [request: import('../heartbeat').HeartbeatSystemEventRequest];
		result: import('../heartbeat').HeartbeatSystemEventResult;
	};
	[HeartbeatChannels.request]: {
		args: [request: import('../heartbeat').HeartbeatWakeRequest];
		result: void;
	};
}

export interface HeartbeatEventChannelMap {
	[HeartbeatChannels.event]: { data: import('../heartbeat').HeartbeatEventPayload };
}
