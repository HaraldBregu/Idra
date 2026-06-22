export type HeartbeatTarget = 'none' | 'last' | string;

export type HeartbeatDirectPolicy = 'allow' | 'block';

export interface HeartbeatActiveHours {
	start: string;
	end: string;
}

export interface HeartbeatSettings {
	every: string;
	target: HeartbeatTarget;
	directPolicy: HeartbeatDirectPolicy;
	lightContext: boolean;
	isolatedSession: boolean;
	skipWhenBusy: boolean;
	activeHours?: HeartbeatActiveHours;
	includeReasoning?: boolean;
}
