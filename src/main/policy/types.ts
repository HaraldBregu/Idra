export type Permission = 'read' | 'write' | 'create' | 'delete';

export type PolicyOutcome = 'allow' | 'deny';

export interface PolicyEntry {
	path: string;
	permissions: Permission[];
	recursive: boolean;
}

export interface PolicyConfig {
	version: number;
	defaultPolicy: PolicyOutcome;
	paths: PolicyEntry[];
}

export interface PolicyDecision {
	path: string;
	outcome: PolicyOutcome;
	matched: PolicyEntry | null;
	reason: string;
}
