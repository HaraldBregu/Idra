export type HealthEvery = '0m' | '1m' | '30m' | '1h';

export type HealthTarget = 'none' | 'last' | string;

export type HealthDirectPolicy = 'allow' | 'block';

export interface HealthActiveHours {
	start: string;
	end: string;
}

export interface HealthSettings {
	every: HealthEvery;
	target: HealthTarget;
	directPolicy: HealthDirectPolicy;
	lightContext: boolean;
	isolatedSession: boolean;
	skipWhenBusy: boolean;
	activeHours?: HealthActiveHours;
	includeReasoning?: boolean;
}

export const DEFAULT_HEALTH_SETTINGS: HealthSettings = {
	every: '30m',
	target: 'last',
	directPolicy: 'allow',
	lightContext: true,
	isolatedSession: true,
	skipWhenBusy: true,
};
