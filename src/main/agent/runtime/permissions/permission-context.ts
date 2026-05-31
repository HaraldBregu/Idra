export type PermissionDecision =
	| { behavior: 'allow'; input?: unknown }
	| { behavior: 'deny'; message: string }
	| { behavior: 'ask'; message: string; input?: unknown };

export type PermissionMode = 'default' | 'plan' | 'auto' | 'bypass';

export type PermissionRule = {
	toolName?: string;
	pattern?: string;
};

export type PermissionContext = {
	mode: PermissionMode;
	alwaysAllowRules: PermissionRule[];
	alwaysDenyRules: PermissionRule[];
	alwaysAskRules: PermissionRule[];
	additionalWorkingDirectories: string[];
	requestApproval?(request: PermissionRequest): Promise<PermissionDecision>;
};

export type PermissionRequest = {
	toolName: string;
	input: unknown;
	message: string;
};
