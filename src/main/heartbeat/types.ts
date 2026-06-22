export type HeartbeatEvery = '0m' | '1m' | '30m' | '1h';

export type HeartbeatTarget = 'none' | 'last' | string;

export type HeartbeatDirectPolicy = 'allow' | 'block';

export interface HeartbeatActiveHours {
	start: string;
	end: string;
}

export interface HeartbeatSettings {
	every: HeartbeatEvery;
	target: HeartbeatTarget;
	directPolicy: HeartbeatDirectPolicy;
	lightContext: boolean;
	isolatedSession: boolean;
	skipWhenBusy: boolean;
	activeHours?: HeartbeatActiveHours;
	includeReasoning?: boolean;
}
