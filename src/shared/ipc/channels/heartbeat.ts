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
	[HeartbeatChannels.status]: { args: []; result: unknown };
	[HeartbeatChannels.last]: { args: []; result: unknown };
	[HeartbeatChannels.settings]: { args: []; result: unknown };
	[HeartbeatChannels.saveSettings]: { args: [request: unknown]; result: unknown };
	[HeartbeatChannels.setEnabled]: { args: [request: unknown]; result: unknown };
	[HeartbeatChannels.getTiming]: { args: []; result: unknown };
	[HeartbeatChannels.updateTiming]: { args: [request: unknown]; result: unknown };
	[HeartbeatChannels.setProviderId]: { args: [request: unknown]; result: unknown };
	[HeartbeatChannels.setModelId]: { args: [request: unknown]; result: unknown };
	[HeartbeatChannels.setReasoningEffort]: { args: [request: unknown]; result: unknown };
	[HeartbeatChannels.systemEvent]: { args: [request: unknown]; result: unknown };
	[HeartbeatChannels.request]: { args: [request: unknown]; result: void };
}

export interface HeartbeatEventChannelMap {
	[HeartbeatChannels.event]: { data: unknown };
}
