export type SandboxState = 'ready' | 'setup_required' | 'unavailable';

export interface SandboxStatus {
	state: SandboxState;
	platform: NodeJS.Platform;
	message?: string;
}

export type ExecutionMode = 'sandbox' | 'host';
